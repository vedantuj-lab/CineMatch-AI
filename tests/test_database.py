"""
Unit and Integration Tests for SQLite Database Module.
"""

import os
import pytest
import tempfile
from backend.database import Database


@pytest.fixture
def test_db():
    # Create temporary database file
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    db = Database(path)
    yield db
    if os.path.exists(path):
        os.remove(path)


def test_init_and_default_profile(test_db):
    profile = test_db.get_or_create_profile("guest_default")
    assert profile["profile_id"] == "guest_default"
    assert profile["display_name"] == "Guest Explorer"


def test_custom_profile_creation(test_db):
    prof = test_db.get_or_create_profile("user_alice", "Alice MovieBuff")
    assert prof["profile_id"] == "user_alice"
    assert prof["display_name"] == "Alice MovieBuff"

    profiles = test_db.list_profiles()
    profile_ids = [p["profile_id"] for p in profiles]
    assert "user_alice" in profile_ids


def test_register_and_login_user(test_db):
    # Register with password
    reg = test_db.register_user("bob_ross", "Bob Ross", "paint123")
    assert reg["profile_id"] == "bob_ross"
    assert reg["display_name"] == "Bob Ross"

    # Login with correct password
    log = test_db.login_user("bob_ross", "paint123")
    assert log["profile_id"] == "bob_ross"

    # Login with wrong password should fail
    with pytest.raises(ValueError):
        test_db.login_user("bob_ross", "wrongpass")

    # Seamless auto-registration for new username without friction
    charlie = test_db.login_user("charlie_chaplin")
    assert charlie["profile_id"] == "charlie_chaplin"


def test_ratings_create_update_delete(test_db):
    # Valid rating
    r = test_db.save_rating("user_alice", 1, 4.5)
    assert r["rating"] == 4.5
    assert r["movie_id"] == 1

    # Check retrieval
    val = test_db.get_rating_for_movie("user_alice", 1)
    assert val == 4.5

    # Update rating
    r2 = test_db.save_rating("user_alice", 1, 5.0)
    assert r2["rating"] == 5.0
    assert test_db.get_rating_for_movie("user_alice", 1) == 5.0

    # Ensure no duplicate rows created
    ratings = test_db.get_ratings("user_alice")
    assert len(ratings) == 1

    # Delete rating
    deleted = test_db.delete_rating("user_alice", 1)
    assert deleted is True
    assert test_db.get_rating_for_movie("user_alice", 1) is None


def test_ratings_invalid_scale(test_db):
    with pytest.raises(ValueError):
        test_db.save_rating("user_alice", 1, 6.0)

    with pytest.raises(ValueError):
        test_db.save_rating("user_alice", 1, 0.2)


def test_watchlist_operations(test_db):
    # Add to watchlist
    w1 = test_db.add_to_watchlist("user_alice", 260)
    assert w1["movie_id"] == 260
    assert test_db.is_in_watchlist("user_alice", 260) is True

    # Duplicate add should be safely ignored
    test_db.add_to_watchlist("user_alice", 260)
    items = test_db.get_watchlist("user_alice")
    assert len(items) == 1

    # Remove from watchlist
    removed = test_db.remove_from_watchlist("user_alice", 260)
    assert removed is True
    assert test_db.is_in_watchlist("user_alice", 260) is False


def test_preferences_persistence(test_db):
    genres = ["Sci-Fi", "Action", "Thriller"]
    fav_movies = [1, 260, 1196]

    res = test_db.save_preferences("user_alice", genres, fav_movies)
    assert set(res["preferred_genres"]) == set(genres)
    assert set(res["favorite_movies"]) == set(fav_movies)

    fetched = test_db.get_preferences("user_alice")
    assert set(fetched["preferred_genres"]) == set(genres)
    assert set(fetched["favorite_movies"]) == set(fav_movies)


def test_profile_analytics(test_db):
    test_db.save_rating("user_alice", 1, 4.0)
    test_db.save_rating("user_alice", 2, 5.0)
    test_db.save_rating("user_alice", 3, 3.0)
    test_db.add_to_watchlist("user_alice", 4)
    test_db.add_to_watchlist("user_alice", 5)

    stats = test_db.get_profile_analytics("user_alice")
    assert stats["total_ratings"] == 3
    assert stats["average_user_rating"] == 4.0
    assert stats["watchlist_count"] == 2
