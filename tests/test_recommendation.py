"""
Unit and Integration Tests for CineMatch AI Recommendation Engine and Data Loader.
"""

import os
import pytest
import pandas as pd
from backend.data_loader import MovieLensDataLoader, DatasetValidationError
from backend.recommendation_engine import RecommendationEngine

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "data")


@pytest.fixture(scope="module")
def loaded_engine():
    loader = MovieLensDataLoader(DATA_DIR)
    movies_df, ratings_df, tags_df, links_df, report = loader.validate_and_load()
    engine = RecommendationEngine(movies_df, ratings_df)
    return engine, report


def test_dataset_loader_validation(loaded_engine):
    _, report = loaded_engine
    assert report["is_valid"] is True
    assert report["movies_count"] > 1000
    assert report["ratings_count"] > 10000
    assert "genres_list" in report
    assert len(report["genres_list"]) > 10


def test_dataset_validation_missing_file(tmp_path):
    empty_loader = MovieLensDataLoader(str(tmp_path))
    with pytest.raises(DatasetValidationError):
        empty_loader.validate_and_load()


def test_similar_movies_content_ranking(loaded_engine):
    engine, _ = loaded_engine
    # Toy Story is movieId 1
    toy_story_id = 1
    recs = engine.get_similar_movies(toy_story_id, top_k=5)

    assert len(recs) == 5
    # Verify target movie is excluded
    rec_ids = [r["movieId"] for r in recs]
    assert toy_story_id not in rec_ids

    # Verify scores are sorted descending
    scores = [r["similarity_score"] for r in recs]
    assert scores == sorted(scores, reverse=True)

    # Verify explanation is present and non-empty
    for r in recs:
        assert "explanation" in r
        assert len(r["explanation"]) > 5
        assert r["algorithm"] == "content_tfidf_cosine"


def test_similar_movies_invalid_id(loaded_engine):
    engine, _ = loaded_engine
    with pytest.raises(KeyError):
        engine.get_similar_movies(999999999, top_k=5)


def test_personalized_recommendations_with_favorites(loaded_engine):
    engine, _ = loaded_engine
    # Star Wars IV: movieId 260
    fav_ids = [260]
    preferred_genres = ["Sci-Fi", "Action"]

    recs = engine.get_personalized_recommendations(
        favorite_movie_ids=fav_ids,
        preferred_genres=preferred_genres,
        top_k=8
    )

    assert len(recs) == 8
    rec_ids = [r["movieId"] for r in recs]
    assert 260 not in rec_ids  # Excludes favorite itself

    # Check that returned recommendations have grounded explanations
    for r in recs:
        assert "explanation" in r
        assert r["recommendation_score"] >= 0.0


def test_personalized_disliked_exclusion(loaded_engine):
    engine, _ = loaded_engine
    # Star Wars IV (260) favorite, The Matrix (2571) disliked
    user_ratings = {2571: 1.0}  # explicitly disliked

    recs = engine.get_personalized_recommendations(
        favorite_movie_ids=[260],
        preferred_genres=["Sci-Fi"],
        user_ratings=user_ratings,
        top_k=15
    )

    rec_ids = [r["movieId"] for r in recs]
    assert 2571 not in rec_ids


def test_collaborative_filtering_and_cold_start(loaded_engine):
    engine, _ = loaded_engine

    # Cold start with no ratings: should fall back gracefully
    cold_start_recs = engine.get_collaborative_recommendations(user_ratings={}, top_k=5)
    assert len(cold_start_recs) == 5
    assert cold_start_recs[0]["algorithm"] == "cf_cold_start_fallback"

    # User with several ratings
    user_ratings = {1: 5.0, 318: 5.0, 260: 4.5, 296: 5.0}
    cf_recs = engine.get_collaborative_recommendations(user_ratings=user_ratings, top_k=5)

    assert len(cf_recs) == 5
    cf_rec_ids = [r["movieId"] for r in cf_recs]
    # Movies already rated should not be recommended
    for rated_id in user_ratings.keys():
        assert rated_id not in cf_rec_ids


def test_offline_evaluation_precision_recall(loaded_engine):
    engine, _ = loaded_engine
    eval_res = engine.evaluate_recommendations(k=10)
    assert "precision_at_k" in eval_res
    assert "recall_at_k" in eval_res
    assert eval_res["precision_at_k"] >= 0.0
    assert eval_res["recall_at_k"] >= 0.0
    assert "test_user_id" in eval_res
