"""
Integration Tests for CineMatch AI Flask Endpoints.
"""

import pytest
import json
from backend.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "movies_indexed" in data
    assert data["movies_indexed"] > 0


def test_movies_listing_and_filtering(client):
    # Basic listing
    res = client.get("/api/movies?page=1&limit=10")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["movies"]) == 10
    assert data["total"] > 1000

    # Search by title query
    res_search = client.get("/api/movies?query=matrix")
    assert res_search.status_code == 200
    search_data = res_search.get_json()
    assert any("matrix" in m["title"].lower() for m in search_data["movies"])

    # Filter by genre
    res_genre = client.get("/api/movies?genre=Animation&limit=5")
    assert res_genre.status_code == 200
    genre_data = res_genre.get_json()
    for m in genre_data["movies"]:
        assert "Animation" in m["genres"]


def test_movie_details_endpoint(client):
    # Toy Story is movieId 1
    res = client.get("/api/movies/1")
    assert res.status_code == 200
    data = res.get_json()
    assert data["movieId"] == 1
    assert "Toy Story" in data["title"]
    assert "similar_movies" in data
    assert len(data["similar_movies"]) > 0

    # Non-existent movie ID
    res_404 = client.get("/api/movies/999999999")
    assert res_404.status_code == 404


def test_content_recommendations_endpoint(client):
    res = client.get("/api/recommendations/1?top_k=6")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] == 6
    assert len(data["recommendations"]) == 6
    # Target movie must not be in recommendations
    assert all(r["movieId"] != 1 for r in data["recommendations"])


def test_personalized_recommendations_endpoint(client):
    payload = {
        "favorite_movies": [1, 260],
        "preferred_genres": ["Animation", "Sci-Fi"],
        "method": "content",
        "top_k": 8
    }
    res = client.post(
        "/api/recommendations/personalized",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["recommendations"]) == 8
    assert data["method"] == "content_personalized"


def test_ratings_lifecycle(client):
    # Create rating
    rating_payload = {"movie_id": 1, "rating": 4.5}
    res_post = client.post(
        "/api/ratings",
        headers={"X-Profile-Id": "test_suite_user"},
        data=json.dumps(rating_payload),
        content_type="application/json"
    )
    assert res_post.status_code == 200

    # Get ratings
    res_get = client.get("/api/ratings", headers={"X-Profile-Id": "test_suite_user"})
    assert res_get.status_code == 200
    get_data = res_get.get_json()
    assert any(r["movie_id"] == 1 and r["rating"] == 4.5 for r in get_data["ratings"])

    # Delete rating
    res_del = client.delete("/api/ratings/1", headers={"X-Profile-Id": "test_suite_user"})
    assert res_del.status_code == 200


def test_watchlist_lifecycle(client):
    # Add to watchlist
    res_add = client.post(
        "/api/watchlist",
        headers={"X-Profile-Id": "test_suite_user"},
        data=json.dumps({"movie_id": 260}),
        content_type="application/json"
    )
    assert res_add.status_code == 201

    # Get watchlist
    res_get = client.get("/api/watchlist", headers={"X-Profile-Id": "test_suite_user"})
    assert res_get.status_code == 200
    w_data = res_get.get_json()
    assert any(w["movie_id"] == 260 for w in w_data["watchlist"])

    # Remove from watchlist
    res_del = client.delete("/api/watchlist/260", headers={"X-Profile-Id": "test_suite_user"})
    assert res_del.status_code == 200


def test_preferences_lifecycle(client):
    payload = {
        "preferred_genres": ["Drama", "Thriller"],
        "favorite_movies": [296, 318]
    }
    res_post = client.post(
        "/api/preferences",
        headers={"X-Profile-Id": "test_suite_user"},
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert res_post.status_code == 200

    res_get = client.get("/api/preferences", headers={"X-Profile-Id": "test_suite_user"})
    assert res_get.status_code == 200
    data = res_get.get_json()
    assert set(data["preferences"]["preferred_genres"]) == {"Drama", "Thriller"}


def test_analytics_and_evaluation(client):
    res_analytics = client.get("/api/analytics", headers={"X-Profile-Id": "test_suite_user"})
    assert res_analytics.status_code == 200
    a_data = res_analytics.get_json()
    assert a_data["total_movies_available"] > 0
    assert "user_rating_distribution" in a_data

    res_eval = client.get("/api/evaluation?k=5")
    assert res_eval.status_code == 200
    e_data = res_eval.get_json()
    assert "precision_at_k" in e_data


def test_auth_endpoints(client):
    # Test register
    reg_payload = {"username": "diana_prince", "display_name": "Diana Prince", "password": "pass"}
    res_reg = client.post("/api/auth/register", data=json.dumps(reg_payload), content_type="application/json")
    assert res_reg.status_code == 201
    data_reg = res_reg.get_json()
    assert data_reg["user"]["profile_id"] == "diana_prince"

    # Test login
    log_payload = {"username": "diana_prince", "password": "pass"}
    res_log = client.post("/api/auth/login", data=json.dumps(log_payload), content_type="application/json")
    assert res_log.status_code == 200
    data_log = res_log.get_json()
    assert data_log["user"]["display_name"] == "Diana Prince"

    # Test auth me
    res_me = client.get("/api/auth/me", headers={"X-Profile-Id": "diana_prince"})
    assert res_me.status_code == 200
    data_me = res_me.get_json()
    assert data_me["user"]["profile_id"] == "diana_prince"
    assert data_me["user"]["is_guest"] is False

