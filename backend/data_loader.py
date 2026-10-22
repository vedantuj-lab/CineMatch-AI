"""
CineMatch AI — Data Loader & Validator
Loads, validates, and preprocesses MovieLens datasets (movies.csv, ratings.csv, tags.csv, links.csv).
"""

import os
import re
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, Optional


class DatasetValidationError(Exception):
    """Raised when critical validation checks fail."""
    pass


class MovieLensDataLoader:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.movies_path = os.path.join(data_dir, "movies.csv")
        self.ratings_path = os.path.join(data_dir, "ratings.csv")
        self.tags_path = os.path.join(data_dir, "tags.csv")
        self.links_path = os.path.join(data_dir, "links.csv")

        self.validation_report: Dict[str, Any] = {
            "is_valid": False,
            "movies_count": 0,
            "ratings_count": 0,
            "tags_count": 0,
            "links_count": 0,
            "warnings": [],
            "errors": [],
            "genres_list": [],
            "years_range": (None, None)
        }

        self.movies_df: Optional[pd.DataFrame] = None
        self.ratings_df: Optional[pd.DataFrame] = None
        self.tags_df: Optional[pd.DataFrame] = None
        self.links_df: Optional[pd.DataFrame] = None

    def validate_and_load(self) -> Tuple[pd.DataFrame, pd.DataFrame, Optional[pd.DataFrame], Optional[pd.DataFrame], Dict[str, Any]]:
        """
        Validates presence and schema of dataset files, cleans data,
        computes aggregate metrics, and returns structured dataframes.
        """
        # 1. Verify existence of required files
        if not os.path.exists(self.movies_path):
            err = f"Missing required movies dataset file: {self.movies_path}"
            self.validation_report["errors"].append(err)
            raise DatasetValidationError(err)

        if not os.path.exists(self.ratings_path):
            err = f"Missing required ratings dataset file: {self.ratings_path}"
            self.validation_report["errors"].append(err)
            raise DatasetValidationError(err)

        # 2. Load movies.csv
        try:
            movies_raw = pd.read_csv(self.movies_path)
        except Exception as e:
            err = f"Failed to parse movies.csv: {str(e)}"
            self.validation_report["errors"].append(err)
            raise DatasetValidationError(err)

        # Check required columns in movies
        req_movie_cols = {"movieId", "title", "genres"}
        if not req_movie_cols.issubset(set(movies_raw.columns)):
            err = f"movies.csv is missing required columns: {req_movie_cols - set(movies_raw.columns)}"
            self.validation_report["errors"].append(err)
            raise DatasetValidationError(err)

        # 3. Load ratings.csv
        try:
            ratings_raw = pd.read_csv(self.ratings_path)
        except Exception as e:
            err = f"Failed to parse ratings.csv: {str(e)}"
            self.validation_report["errors"].append(err)
            raise DatasetValidationError(err)

        req_rating_cols = {"userId", "movieId", "rating"}
        if not req_rating_cols.issubset(set(ratings_raw.columns)):
            err = f"ratings.csv is missing required columns: {req_rating_cols - set(ratings_raw.columns)}"
            self.validation_report["errors"].append(err)
            raise DatasetValidationError(err)

        # 4. Optional tags.csv
        if os.path.exists(self.tags_path):
            try:
                self.tags_df = pd.read_csv(self.tags_path)
                if not {"userId", "movieId", "tag"}.issubset(set(self.tags_df.columns)):
                    self.validation_report["warnings"].append("tags.csv found but missing standard columns. Ignoring tags.")
                    self.tags_df = None
                else:
                    self.validation_report["tags_count"] = len(self.tags_df)
            except Exception as e:
                self.validation_report["warnings"].append(f"Failed to read optional tags.csv: {str(e)}")
                self.tags_df = None

        # 5. Optional links.csv
        if os.path.exists(self.links_path):
            try:
                self.links_df = pd.read_csv(self.links_path)
                self.validation_report["links_count"] = len(self.links_df)
            except Exception as e:
                self.validation_report["warnings"].append(f"Failed to read optional links.csv: {str(e)}")
                self.links_df = None

        # 6. Validate movies data
        # Check duplicate movie IDs
        dup_movie_ids = movies_raw[movies_raw.duplicated(subset=["movieId"], keep=False)]
        if len(dup_movie_ids) > 0:
            self.validation_report["warnings"].append(f"Found {len(dup_movie_ids)} duplicate movie IDs. Keeping first occurrence.")
            movies_raw = movies_raw.drop_duplicates(subset=["movieId"], keep="first")

        # Check null/empty titles
        null_titles = movies_raw[movies_raw["title"].isna() | (movies_raw["title"].str.strip() == "")]
        if len(null_titles) > 0:
            self.validation_report["warnings"].append(f"Dropping {len(null_titles)} movies with missing/empty title.")
            movies_raw = movies_raw[~movies_raw.index.isin(null_titles.index)]

        # Extract release year from title: e.g. "Toy Story (1995)" -> 1995
        def parse_title_and_year(raw_title: str) -> Tuple[str, Optional[int]]:
            raw_title = str(raw_title).strip()
            # Match 4 digits in parentheses at end of title
            match = re.search(r"\((\d{4})\)\s*$", raw_title)
            if match:
                year = int(match.group(1))
                # Remove year from title
                clean_title = re.sub(r"\s*\(\d{4}\)\s*$", "", raw_title).strip()
                return clean_title, year
            return raw_title, None

        title_parsed = [parse_title_and_year(t) for t in movies_raw["title"]]
        movies_raw["clean_title"] = [p[0] for p in title_parsed]
        movies_raw["release_year"] = [p[1] for p in title_parsed]

        # Clean genres: handle '(no genres listed)' and NaN
        def clean_genres(g: Any) -> list:
            if pd.isna(g) or not str(g).strip() or str(g).strip() == "(no genres listed)":
                return []
            return [x.strip() for x in str(g).split("|") if x.strip() and x.strip() != "(no genres listed)"]

        movies_raw["genre_list"] = movies_raw["genres"].apply(clean_genres)
        movies_raw["genres_display"] = movies_raw["genre_list"].apply(lambda gl: ", ".join(gl) if gl else "Unspecified")

        # Gather all distinct genres
        all_genres = sorted(list({genre for sublist in movies_raw["genre_list"] for genre in sublist if genre}))
        self.validation_report["genres_list"] = all_genres

        # Years range
        valid_years = movies_raw["release_year"].dropna()
        if len(valid_years) > 0:
            self.validation_report["years_range"] = (int(valid_years.min()), int(valid_years.max()))

        # 7. Validate ratings data
        # Ensure ratings are numeric and between 0.5 and 5.0
        ratings_raw["rating"] = pd.to_numeric(ratings_raw["rating"], errors="coerce")
        invalid_ratings = ratings_raw[ratings_raw["rating"].isna() | (ratings_raw["rating"] < 0.5) | (ratings_raw["rating"] > 5.0)]
        if len(invalid_ratings) > 0:
            self.validation_report["warnings"].append(f"Filtered out {len(invalid_ratings)} invalid rating entries outside [0.5, 5.0].")
            ratings_raw = ratings_raw[~ratings_raw.index.isin(invalid_ratings.index)]

        # Check invalid movie references in ratings
        movie_ids_set = set(movies_raw["movieId"])
        dangling_ratings = ratings_raw[~ratings_raw["movieId"].isin(movie_ids_set)]
        if len(dangling_ratings) > 0:
            self.validation_report["warnings"].append(f"Removed {len(dangling_ratings)} ratings referencing non-existent movie IDs.")
            ratings_raw = ratings_raw[ratings_raw["movieId"].isin(movie_ids_set)]

        # 8. Compute rating aggregates per movie
        rating_stats = ratings_raw.groupby("movieId")["rating"].agg(["count", "mean"]).reset_index()
        rating_stats.rename(columns={"count": "ratings_count", "mean": "avg_rating"}, inplace=True)
        rating_stats["avg_rating"] = rating_stats["avg_rating"].round(2)

        # Merge aggregates into movies_df
        movies_df = pd.merge(movies_raw, rating_stats, on="movieId", how="left")
        movies_df["ratings_count"] = movies_df["ratings_count"].fillna(0).astype(int)
        movies_df["avg_rating"] = movies_df["avg_rating"].fillna(0.0)

        # 9. Aggregate tags per movie if available
        if self.tags_df is not None:
            tags_clean = self.tags_df.dropna(subset=["tag", "movieId"]).copy()
            tags_clean["tag"] = tags_clean["tag"].astype(str).str.lower().str.strip()
            tags_clean = tags_clean[tags_clean["movieId"].isin(movie_ids_set)]
            
            # Combine tags per movie
            tags_agg = tags_clean.groupby("movieId")["tag"].apply(lambda tags: list(set(tags))).reset_index()
            tags_agg.rename(columns={"tag": "tags_list"}, inplace=True)
            movies_df = pd.merge(movies_df, tags_agg, on="movieId", how="left")
            movies_df["tags_list"] = movies_df["tags_list"].apply(lambda x: x if isinstance(x, list) else [])
        else:
            movies_df["tags_list"] = [[] for _ in range(len(movies_df))]

        # 10. Merge links if available (for IMDB/TMDB links)
        if self.links_df is not None:
            links_clean = self.links_df.drop_duplicates(subset=["movieId"]).copy()
            movies_df = pd.merge(movies_df, links_clean[["movieId", "imdbId", "tmdbId"]], on="movieId", how="left")
        else:
            movies_df["imdbId"] = None
            movies_df["tmdbId"] = None

        self.movies_df = movies_df
        self.ratings_df = ratings_raw
        self.validation_report["movies_count"] = len(movies_df)
        self.validation_report["ratings_count"] = len(ratings_raw)
        self.validation_report["is_valid"] = True

        return self.movies_df, self.ratings_df, self.tags_df, self.links_df, self.validation_report


def get_data_loader(data_dir: str = "backend/data") -> MovieLensDataLoader:
    return MovieLensDataLoader(data_dir)
