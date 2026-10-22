"""
CineMatch AI — Recommendation Engine
Implements:
1. Content-Based Filtering using TF-IDF Vectorization and Cosine Similarity.
2. Personalized Multi-Criteria Aggregation (Favorite Movies + Genre Matching + Quality Regularization).
3. Item-Based Collaborative Filtering using sparse User-Item interaction matrix.
4. Grounded, non-hallucinated recommendation explanations.
5. Quality evaluation metrics (Precision@K, Recall@K).
"""

import os
import re
from typing import List, Dict, Any, Optional, Tuple, Set
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class RecommendationEngine:
    def __init__(self, movies_df: pd.DataFrame, ratings_df: pd.DataFrame):
        self.movies_df = movies_df.copy()
        self.ratings_df = ratings_df.copy()

        # Quick lookup dictionaries
        self.movie_id_to_idx: Dict[int, int] = {}
        self.idx_to_movie_id: Dict[int, int] = {}
        self.movie_records: Dict[int, Dict[str, Any]] = {}

        self._prepare_lookups()

        # Content-Based TF-IDF models
        self.tfidf_vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None
        self._build_content_feature_matrix()

        # Collaborative Filtering Models
        self.user_item_matrix = None
        self.item_item_sim_matrix = None
        self.cf_movie_id_to_idx: Dict[int, int] = {}
        self.cf_idx_to_movie_id: Dict[int, int] = {}
        self._build_collaborative_model()

    def _prepare_lookups(self):
        """Index movies for fast retrieval."""
        for idx, row in self.movies_df.iterrows():
            m_id = int(row["movieId"])
            self.movie_id_to_idx[m_id] = idx
            self.idx_to_movie_id[idx] = m_id
            
            self.movie_records[m_id] = {
                "movieId": m_id,
                "title": row.get("clean_title", row["title"]),
                "full_title": row["title"],
                "release_year": int(row["release_year"]) if pd.notna(row.get("release_year")) else None,
                "genres": row.get("genre_list", []),
                "genres_display": row.get("genres_display", "Unspecified"),
                "avg_rating": float(row.get("avg_rating", 0.0)),
                "ratings_count": int(row.get("ratings_count", 0)),
                "tags": row.get("tags_list", []),
                "imdbId": str(row["imdbId"]) if pd.notna(row.get("imdbId")) else None,
                "tmdbId": str(row["tmdbId"]) if pd.notna(row.get("tmdbId")) else None,
            }

    def _build_content_feature_matrix(self):
        """
        Creates weighted multi-field text representation and builds TF-IDF matrix.
        Weighting scheme:
        - Genres: 3x weight (repeated 3 times to ensure strong genre clustering)
        - User tags: 2x weight (high thematic relevance)
        - Clean Title tokens: 1x weight
        """
        corpus = []
        for _, row in self.movies_df.iterrows():
            genres = row.get("genre_list", [])
            tags = row.get("tags_list", [])
            title = str(row.get("clean_title", ""))

            # Normalize multi-word genres (e.g. 'Sci-Fi' -> 'scifi', 'Film-Noir' -> 'filmnoir')
            norm_genres = [g.lower().replace("-", "").replace(" ", "") for g in genres]
            genre_tokens = " ".join(norm_genres * 3)

            # Clean and normalize tags
            clean_tags = [re.sub(r"[^a-zA-Z0-9\s]", "", str(t)).lower().strip() for t in tags]
            clean_tags = [t for t in clean_tags if t]
            tag_tokens = " ".join(clean_tags * 2)

            # Title tokens
            clean_title = re.sub(r"[^a-zA-Z0-9\s]", " ", title).lower().strip()

            combined = f"{genre_tokens} {tag_tokens} {clean_title}".strip()
            if not combined:
                combined = "unspecified movie"
            corpus.append(combined)

        self.tfidf_vectorizer = TfidfVectorizer(
            analyzer="word",
            stop_words="english",
            min_df=1,
            ngram_range=(1, 2)
        )
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(corpus)

    def _build_collaborative_model(self):
        """
        Builds Item-Based Collaborative Filtering model using MovieLens ratings.
        Filters movies with at least 5 ratings to reduce extreme sparsity noise.
        Computes item-to-item cosine similarity on user rating vectors.
        """
        if self.ratings_df is None or len(self.ratings_df) == 0:
            return

        # Keep items with >= 5 ratings for robust CF representation
        counts = self.ratings_df["movieId"].value_counts()
        valid_mids = counts[counts >= 5].index
        cf_ratings = self.ratings_df[self.ratings_df["movieId"].isin(valid_mids)].copy()

        user_ids = cf_ratings["userId"].unique()
        movie_ids = cf_ratings["movieId"].unique()

        user_to_idx = {uid: i for i, uid in enumerate(user_ids)}
        self.cf_movie_id_to_idx = {mid: i for i, mid in enumerate(movie_ids)}
        self.cf_idx_to_movie_id = {i: mid for mid, i in self.cf_movie_id_to_idx.items()}

        rows = cf_ratings["movieId"].map(self.cf_movie_id_to_idx).values
        cols = cf_ratings["userId"].map(user_to_idx).values
        data = cf_ratings["rating"].values

        # Sparse Item x User matrix
        item_user_matrix = csr_matrix((data, (rows, cols)), shape=(len(movie_ids), len(user_ids)))

        # Precompute item-item cosine similarity
        self.item_item_sim_matrix = cosine_similarity(item_user_matrix, dense_output=False)

    # -------------------------------------------------------------
    # 1. Content-Based Recommendations for a Selected Movie
    # -------------------------------------------------------------
    def get_similar_movies(self, movie_id: int, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Calculates cosine similarities for a given movie using the cached TF-IDF matrix.
        Excludes the movie itself. Returns ranked candidates with similarity scores and explanations.
        """
        movie_id = int(movie_id)
        if movie_id not in self.movie_id_to_idx:
            raise KeyError(f"Movie ID {movie_id} does not exist in catalogue.")

        target_idx = self.movie_id_to_idx[movie_id]
        target_meta = self.movie_records[movie_id]
        target_vector = self.tfidf_matrix[target_idx]

        # Cosine similarity vector
        sim_scores = cosine_similarity(target_vector, self.tfidf_matrix).flatten()

        # Sort descending
        top_indices = np.argsort(sim_scores)[::-1]

        recommendations = []
        for idx in top_indices:
            cand_id = self.idx_to_movie_id[idx]
            if cand_id == movie_id:
                continue

            score = float(sim_scores[idx])
            if score <= 0.001 and len(recommendations) >= top_k:
                break

            cand_meta = self.movie_records[cand_id]
            explanation = self._generate_content_explanation(target_meta, cand_meta, score)

            rec_item = dict(cand_meta)
            rec_item["similarity_score"] = round(score, 4)
            rec_item["explanation"] = explanation
            rec_item["algorithm"] = "content_tfidf_cosine"
            recommendations.append(rec_item)

            if len(recommendations) >= top_k:
                break

        return recommendations

    def _generate_content_explanation(self, target: Dict[str, Any], cand: Dict[str, Any], score: float) -> str:
        """Grounded explanation derived from actual feature overlap."""
        target_genres = set(target.get("genres", []))
        cand_genres = set(cand.get("genres", []))
        shared_genres = target_genres.intersection(cand_genres)

        target_tags = set(target.get("tags", []))
        cand_tags = set(cand.get("tags", []))
        shared_tags = target_tags.intersection(cand_tags)

        explanations = []
        if shared_genres:
            genre_str = ", ".join(sorted(list(shared_genres)))
            explanations.append(f"Shares {genre_str} with {target['title']}")

        if shared_tags:
            tag_str = ", ".join(list(shared_tags)[:3])
            explanations.append(f"matches community tags: '{tag_str}'")

        if not explanations:
            return f"Similar thematic attributes and title semantics (Similarity: {score:.2f})"

        return f"{'; '.join(explanations)} (Similarity: {score:.2f})"

    # -------------------------------------------------------------
    # 2. Personalized Recommendations
    # -------------------------------------------------------------
    def get_personalized_recommendations(
        self,
        favorite_movie_ids: List[int],
        preferred_genres: List[str],
        user_ratings: Optional[Dict[int, float]] = None,
        watchlist_movie_ids: Optional[List[int]] = None,
        exclude_rated: bool = True,
        exclude_watchlist: bool = False,
        content_weight: float = 0.55,
        genre_weight: float = 0.30,
        rating_quality_weight: float = 0.15,
        top_k: int = 12
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes personalized recommendations combining:
        - Similarity to user's favorite movies (TF-IDF aggregated vector)
        - Preferred genre match
        - Quality regularization (dataset average rating normalized, so popularity doesn't dominate)
        Excludes user-disliked movies (ratings <= 2.0) and optionally rated/watchlist movies.
        """
        user_ratings = user_ratings or {}
        watchlist_ids = set(watchlist_movie_ids or [])
        disliked_ids = {mid for mid, r in user_ratings.items() if r <= 2.0}

        # Filter out invalid movie IDs
        valid_fav_ids = [mid for mid in favorite_movie_ids if mid in self.movie_id_to_idx]
        fav_ids_set = set(valid_fav_ids)

        num_movies = len(self.movies_df)

        # Base similarity array
        if valid_fav_ids:
            fav_indices = [self.movie_id_to_idx[mid] for mid in valid_fav_ids]
            # Aggregate similarity vectors (mean across favorites)
            fav_vectors = self.tfidf_matrix[fav_indices]
            sim_to_favs = cosine_similarity(fav_vectors, self.tfidf_matrix)  # shape: (len(fav), num_movies)
            content_sim_scores = np.mean(sim_to_favs, axis=0)
        else:
            # Cold-start fallback: neutral content scores
            content_sim_scores = np.zeros(num_movies)

        # Genre match score array (0.0 to 1.0)
        genre_scores = np.zeros(num_movies)
        preferred_genre_set = {g.strip().lower() for g in preferred_genres if g.strip()}
        if preferred_genre_set:
            for idx, row in self.movies_df.iterrows():
                m_genres = {g.lower() for g in row.get("genre_list", [])}
                if m_genres:
                    overlap = len(preferred_genre_set.intersection(m_genres))
                    genre_scores[idx] = overlap / max(len(preferred_genre_set), 1)

        # Quality regularization score (avg_rating / 5.0)
        quality_scores = (self.movies_df["avg_rating"].values / 5.0)

        # Normalize weights
        total_w = content_weight + genre_weight + rating_quality_weight
        w_c = content_weight / total_w
        w_g = genre_weight / total_w
        w_q = rating_quality_weight / total_w

        # If user has no favorites, rebalance weights towards genre + quality
        if not valid_fav_ids:
            if preferred_genre_set:
                w_c = 0.0
                w_g = 0.70
                w_q = 0.30
            else:
                w_c = 0.0
                w_g = 0.0
                w_q = 1.0

        composite_scores = (w_c * content_sim_scores) + (w_g * genre_scores) + (w_q * quality_scores)

        # Rank candidate movies
        ranked_indices = np.argsort(composite_scores)[::-1]

        recommendations = []
        for idx in ranked_indices:
            cand_id = self.idx_to_movie_id[idx]

            # Exclude favorites themselves
            if cand_id in fav_ids_set:
                continue

            # Exclude explicitly disliked movies
            if cand_id in disliked_ids:
                continue

            # Exclude already rated if requested
            if exclude_rated and cand_id in user_ratings:
                continue

            # Exclude watchlist if requested
            if exclude_watchlist and cand_id in watchlist_ids:
                continue

            cand_meta = self.movie_records[cand_id]
            explanation = self._generate_personalized_explanation(
                cand_meta,
                valid_fav_ids,
                preferred_genre_set,
                float(content_sim_scores[idx]),
                float(genre_scores[idx]),
                cand_meta["avg_rating"]
            )

            rec_item = dict(cand_meta)
            rec_item["recommendation_score"] = round(float(composite_scores[idx]), 4)
            rec_item["content_similarity"] = round(float(content_sim_scores[idx]), 4)
            rec_item["genre_match"] = round(float(genre_scores[idx]), 4)
            rec_item["explanation"] = explanation
            rec_item["algorithm"] = "personalized_hybrid"
            recommendations.append(rec_item)

            if len(recommendations) >= top_k:
                break

        return recommendations

    def _generate_personalized_explanation(
        self,
        cand: Dict[str, Any],
        fav_ids: List[int],
        pref_genres: Set[str],
        content_sim: float,
        genre_match: float,
        avg_rating: float
    ) -> str:
        reasons = []

        cand_genres = [g.lower() for g in cand.get("genres", [])]
        matched_genres = [g.title() for g in cand_genres if g in pref_genres]
        if matched_genres:
            reasons.append(f"Matches preferred genre{'s' if len(matched_genres) > 1 else ''}: {', '.join(matched_genres)}")

        if fav_ids and content_sim > 0.08:
            # Find which favorite had highest similarity
            cand_idx = self.movie_id_to_idx[cand["movieId"]]
            cand_vec = self.tfidf_matrix[cand_idx]
            best_fav_id = None
            best_fav_score = -1.0
            for fid in fav_ids:
                f_idx = self.movie_id_to_idx[fid]
                f_score = float(cosine_similarity(cand_vec, self.tfidf_matrix[f_idx])[0][0])
                if f_score > best_fav_score:
                    best_fav_score = f_score
                    best_fav_id = fid

            if best_fav_id and best_fav_score > 0.05:
                fav_title = self.movie_records[best_fav_id]["title"]
                reasons.append(f"Content attributes aligned with '{fav_title}'")

        if avg_rating >= 4.0:
            reasons.append(f"Critically acclaimed ({avg_rating:.1f}/5.0 avg)")

        if not reasons:
            return f"Curated selection matching your viewing profile (Score: {content_sim:.2f})"

        return " • ".join(reasons)

    # -------------------------------------------------------------
    # 3. Collaborative Filtering (Item-Based)
    # -------------------------------------------------------------
    def get_collaborative_recommendations(
        self,
        user_ratings: Dict[int, float],
        top_k: int = 12
    ) -> List[Dict[str, Any]]:
        """
        Item-based collaborative filtering:
        Predicts ratings for unrated candidate movies based on user's rated items
        and precomputed item-item rating similarity matrix.
        Fallback to hybrid content if user has fewer than 2 valid ratings in CF matrix.
        """
        # Find which rated movies are in CF matrix
        cf_rated = {mid: r for mid, r in user_ratings.items() if mid in self.cf_movie_id_to_idx}

        # Cold-start check
        if len(cf_rated) < 2 or self.item_item_sim_matrix is None:
            # Return clear cold-start explanation
            top_movies = sorted(
                [m for m in self.movie_records.values() if m["movieId"] not in user_ratings],
                key=lambda x: (x["avg_rating"], x["ratings_count"]),
                reverse=True
            )[:top_k]
            res = []
            for m in top_movies:
                item = dict(m)
                item["recommendation_score"] = round(m["avg_rating"] / 5.0, 4)
                item["explanation"] = "Cold-start fallback: Rate at least 2 movies to activate collaborative pattern matching."
                item["algorithm"] = "cf_cold_start_fallback"
                res.append(item)
            return res

        num_cf_items = len(self.cf_movie_id_to_idx)
        weighted_sums = np.zeros(num_cf_items)
        sim_sums = np.zeros(num_cf_items)

        # For each rated item by this user
        for mid, rating in cf_rated.items():
            item_idx = self.cf_movie_id_to_idx[mid]
            # Get similarity row from sparse matrix
            sim_row = self.item_item_sim_matrix[item_idx].toarray().flatten()

            # Positive similarities only for stable projection
            pos_mask = sim_row > 0.05
            weighted_sums[pos_mask] += sim_row[pos_mask] * rating
            sim_sums[pos_mask] += sim_row[pos_mask]

        # Predicted ratings: weighted_sums / sim_sums
        pred_ratings = np.zeros(num_cf_items)
        valid_indices = sim_sums > 0
        pred_ratings[valid_indices] = weighted_sums[valid_indices] / sim_sums[valid_indices]

        # Exclude movies already rated by user
        for mid in user_ratings.keys():
            if mid in self.cf_movie_id_to_idx:
                pred_ratings[self.cf_movie_id_to_idx[mid]] = -1.0

        top_cf_indices = np.argsort(pred_ratings)[::-1]

        recommendations = []
        for idx in top_cf_indices:
            pred = float(pred_ratings[idx])
            if pred <= 0:
                break
            cand_id = self.cf_idx_to_movie_id[idx]
            cand_meta = self.movie_records[cand_id]

            rec_item = dict(cand_meta)
            rec_item["predicted_rating"] = round(pred, 2)
            rec_item["recommendation_score"] = round(pred / 5.0, 4)
            rec_item["explanation"] = f"Community members with matching rating taste also rated this highly (Projected: {pred:.1f}★)"
            rec_item["algorithm"] = "item_based_collaborative"
            recommendations.append(rec_item)

            if len(recommendations) >= top_k:
                break

        return recommendations

    # -------------------------------------------------------------
    # 4. Offline Recommendation Quality Evaluation (Precision@K, Recall@K)
    # -------------------------------------------------------------
    def evaluate_recommendations(self, test_user_id: int = 1, k: int = 10, threshold: float = 4.0) -> Dict[str, Any]:
        """
        Evaluates recommendation quality on a held-out test split of ratings for a user.
        Measures Precision@K and Recall@K without data leakage.
        """
        if self.ratings_df is None or len(self.ratings_df) == 0:
            return {"error": "No ratings data available for evaluation."}

        user_ratings_all = self.ratings_df[self.ratings_df["userId"] == test_user_id].sort_values("timestamp")
        if len(user_ratings_all) < 10:
            # Pick a user with >= 20 ratings
            active_users = self.ratings_df["userId"].value_counts()
            active_candidate = active_users[active_users >= 20].index
            if len(active_candidate) == 0:
                return {"error": "Insufficient ratings per user for evaluation."}
            test_user_id = int(active_candidate[0])
            user_ratings_all = self.ratings_df[self.ratings_df["userId"] == test_user_id].sort_values("timestamp")

        # Time-aware split: 70% train, 30% test
        split_idx = int(len(user_ratings_all) * 0.7)
        train_df = user_ratings_all.iloc[:split_idx]
        test_df = user_ratings_all.iloc[split_idx:]

        # Ground truth relevant movies in test set (rating >= threshold)
        ground_truth_relevant = set(test_df[test_df["rating"] >= threshold]["movieId"])
        if not ground_truth_relevant:
            ground_truth_relevant = set(test_df.sort_values("rating", ascending=False)["movieId"].head(5))

        # Train preferences
        train_ratings_dict = dict(zip(train_df["movieId"], train_df["rating"]))
        train_favs = list(train_df[train_df["rating"] >= threshold]["movieId"].tail(5))
        if not train_favs:
            train_favs = list(train_df["movieId"].tail(3))

        # Generate recommendations using train ratings only
        recs = self.get_personalized_recommendations(
            favorite_movie_ids=train_favs,
            preferred_genres=[],
            user_ratings=train_ratings_dict,
            top_k=k
        )

        rec_ids = [r["movieId"] for r in recs]
        hits = [mid for mid in rec_ids if mid in ground_truth_relevant]

        precision_at_k = len(hits) / max(k, 1)
        recall_at_k = len(hits) / max(len(ground_truth_relevant), 1)

        return {
            "test_user_id": test_user_id,
            "train_ratings_count": len(train_df),
            "test_ratings_count": len(test_df),
            "ground_truth_relevant_count": len(ground_truth_relevant),
            "k": k,
            "hits": len(hits),
            "precision_at_k": round(precision_at_k, 4),
            "recall_at_k": round(recall_at_k, 4),
            "recommended_titles": [r["title"] for r in recs[:5]]
        }
