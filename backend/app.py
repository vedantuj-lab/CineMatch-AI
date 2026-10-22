"""
CineMatch AI — Flask Backend API
Provides RESTful endpoints for movie catalogue, content-based & collaborative recommendations,
ratings persistence, watchlist management, preferences, and analytics.
"""

import os
import json
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS

from backend.data_loader import MovieLensDataLoader, DatasetValidationError
from backend.database import Database
from backend.recommendation_engine import RecommendationEngine

app = Flask(__name__)
CORS(app)

# Environment and Data paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(BASE_DIR, "cinematch.db")

# Initialize SQLite Database
db = Database(DB_PATH)

# Global instances loaded at startup
data_loader = MovieLensDataLoader(DATA_DIR)
movies_df = None
ratings_df = None
tags_df = None
links_df = None
validation_report = {}
rec_engine = None
init_error = None

try:
    movies_df, ratings_df, tags_df, links_df, validation_report = data_loader.validate_and_load()
    rec_engine = RecommendationEngine(movies_df, ratings_df)
    print(f"CineMatch AI Engine successfully initialized with {len(movies_df)} movies and {len(ratings_df)} ratings.")
except Exception as e:
    init_error = str(e)
    print(f"Error during CineMatch AI initialization: {init_error}")
    traceback.print_exc()


def get_active_profile_id() -> str:
    """Extract profile ID from X-Profile-Id header or query parameter, defaults to 'guest_default'."""
    p_id = request.headers.get("X-Profile-Id") or request.args.get("profile_id")
    if p_id and p_id.strip():
        return p_id.strip()
    return "guest_default"


# -------------------------------------------------------------
# 1. Health & System Status
# -------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    if init_error:
        return jsonify({
            "status": "degraded",
            "error": init_error,
            "validation_report": validation_report
        }), 500

    return jsonify({
        "status": "healthy",
        "app_name": "CineMatch AI",
        "tagline": "Your Next Favorite Movie Starts Here",
        "dataset_validation": validation_report,
        "movies_indexed": len(movies_df) if movies_df is not None else 0,
        "ratings_count": len(ratings_df) if ratings_df is not None else 0
    }), 200


# -------------------------------------------------------------
# 2. Movie Catalogue & Details
# -------------------------------------------------------------
@app.route("/api/movies", methods=["GET"])
def list_movies():
    if rec_engine is None:
        return jsonify({"error": "Recommendation engine not initialized"}), 503

    query = request.args.get("query", "").strip().lower()
    genre = request.args.get("genre", "").strip()
    min_year = request.args.get("min_year", type=int)
    max_year = request.args.get("max_year", type=int)
    sort_by = request.args.get("sort_by", "ratings_count").strip()  # ratings_count, avg_rating, release_year, title
    order = request.args.get("order", "desc").strip().lower()
    page = max(1, request.args.get("page", 1, type=int))
    limit = min(100, max(1, request.args.get("limit", 20, type=int)))

    # Filter movies
    results = list(rec_engine.movie_records.values())

    if query:
        results = [
            m for m in results
            if query in m["title"].lower() or any(query in g.lower() for g in m["genres"]) or any(query in t.lower() for t in m.get("tags", []))
        ]

    if genre and genre.lower() != "all":
        results = [m for m in results if any(g.lower() == genre.lower() for g in m["genres"])]

    if min_year:
        results = [m for m in results if m["release_year"] is not None and m["release_year"] >= min_year]

    if max_year:
        results = [m for m in results if m["release_year"] is not None and m["release_year"] <= max_year]

    # Deterministic sorting
    reverse = (order == "desc")
    if sort_by == "avg_rating":
        results.sort(key=lambda x: (x["avg_rating"], x["ratings_count"], x["title"]), reverse=reverse)
    elif sort_by == "release_year":
        results.sort(key=lambda x: (x["release_year"] or 0, x["ratings_count"], x["title"]), reverse=reverse)
    elif sort_by == "title":
        results.sort(key=lambda x: x["title"].lower(), reverse=reverse)
    else:  # default: popularity / ratings_count
        results.sort(key=lambda x: (x["ratings_count"], x["avg_rating"], x["title"]), reverse=reverse)

    total_count = len(results)
    start_idx = (page - 1) * limit
    paginated_results = results[start_idx:start_idx + limit]

    profile_id = get_active_profile_id()
    # Enrich with user rating and watchlist flag
    user_ratings_list = db.get_ratings(profile_id)
    user_ratings_map = {r["movie_id"]: r["rating"] for r in user_ratings_list}
    user_watchlist_set = {w["movie_id"] for w in db.get_watchlist(profile_id)}

    enriched = []
    for item in paginated_results:
        rec = dict(item)
        rec["user_rating"] = user_ratings_map.get(item["movieId"])
        rec["is_in_watchlist"] = item["movieId"] in user_watchlist_set
        enriched.append(rec)

    return jsonify({
        "movies": enriched,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }), 200


@app.route("/api/movies/<int:movie_id>", methods=["GET"])
def get_movie_details(movie_id: int):
    if rec_engine is None:
        return jsonify({"error": "Engine not initialized"}), 503

    if movie_id not in rec_engine.movie_records:
        return jsonify({"error": f"Movie with ID {movie_id} was not found in dataset."}), 404

    movie = dict(rec_engine.movie_records[movie_id])
    profile_id = get_active_profile_id()

    movie["user_rating"] = db.get_rating_for_movie(profile_id, movie_id)
    movie["is_in_watchlist"] = db.is_in_watchlist(profile_id, movie_id)

    # Provide top 6 similar movies with explanations
    try:
        similar = rec_engine.get_similar_movies(movie_id, top_k=6)
        movie["similar_movies"] = similar
    except Exception:
        movie["similar_movies"] = []

    return jsonify(movie), 200


@app.route("/api/genres", methods=["GET"])
def get_genres():
    if rec_engine is None:
        return jsonify({"genres": []}), 200
    return jsonify({
        "genres": validation_report.get("genres_list", [])
    }), 200


# -------------------------------------------------------------
# 3. Recommendation Endpoints
# -------------------------------------------------------------
@app.route("/api/recommendations/<int:movie_id>", methods=["GET"])
def get_content_recommendations(movie_id: int):
    if rec_engine is None:
        return jsonify({"error": "Engine not ready"}), 503

    top_k = min(50, max(1, request.args.get("top_k", 10, type=int)))

    try:
        recs = rec_engine.get_similar_movies(movie_id, top_k=top_k)
        target = rec_engine.movie_records[movie_id]
        return jsonify({
            "target_movie": target,
            "recommendations": recs,
            "algorithm": "content_tfidf_cosine",
            "count": len(recs)
        }), 200
    except KeyError:
        return jsonify({"error": f"Movie ID {movie_id} not found."}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to compute recommendations: {str(e)}"}), 500


@app.route("/api/recommendations/personalized", methods=["POST"])
def get_personalized_recommendations():
    if rec_engine is None:
        return jsonify({"error": "Engine not ready"}), 503

    data = request.get_json(silent=True) or {}
    profile_id = get_active_profile_id()

    # User preferences from request or fall back to persistent preferences in SQLite
    pref = db.get_preferences(profile_id)
    fav_movie_ids = data.get("favorite_movies", pref.get("favorite_movies", []))
    preferred_genres = data.get("preferred_genres", pref.get("preferred_genres", []))

    # Pull user ratings and watchlist from SQLite
    user_ratings_list = db.get_ratings(profile_id)
    user_ratings_dict = {r["movie_id"]: r["rating"] for r in user_ratings_list}
    watchlist_list = db.get_watchlist(profile_id)
    watchlist_ids = [w["movie_id"] for w in watchlist_list]

    method = data.get("method", "content").strip().lower()  # 'content' or 'collaborative'
    exclude_rated = bool(data.get("exclude_rated", True))
    exclude_watchlist = bool(data.get("exclude_watchlist", False))
    top_k = min(50, max(1, int(data.get("top_k", 12))))

    if method == "collaborative":
        recs = rec_engine.get_collaborative_recommendations(
            user_ratings=user_ratings_dict,
            top_k=top_k
        )
        return jsonify({
            "method": "collaborative",
            "recommendations": recs,
            "user_ratings_used": len(user_ratings_dict),
            "profile_id": profile_id
        }), 200

    # Content-based personalized hybrid
    content_weight = float(data.get("content_weight", 0.55))
    genre_weight = float(data.get("genre_weight", 0.30))
    rating_quality_weight = float(data.get("rating_quality_weight", 0.15))

    recs = rec_engine.get_personalized_recommendations(
        favorite_movie_ids=[int(m) for m in fav_movie_ids if str(m).isdigit()],
        preferred_genres=preferred_genres,
        user_ratings=user_ratings_dict,
        watchlist_movie_ids=watchlist_ids,
        exclude_rated=exclude_rated,
        exclude_watchlist=exclude_watchlist,
        content_weight=content_weight,
        genre_weight=genre_weight,
        rating_quality_weight=rating_quality_weight,
        top_k=top_k
    )

    return jsonify({
        "method": "content_personalized",
        "recommendations": recs,
        "favorite_movies_count": len(fav_movie_ids),
        "preferred_genres": preferred_genres,
        "profile_id": profile_id
    }), 200


# -------------------------------------------------------------
# 4. User Ratings (CRUD)
# -------------------------------------------------------------
@app.route("/api/ratings", methods=["GET"])
def get_user_ratings():
    profile_id = get_active_profile_id()
    ratings = db.get_ratings(profile_id)

    # Attach movie details
    enriched = []
    for r in ratings:
        m_id = r["movie_id"]
        movie_meta = rec_engine.movie_records.get(m_id, {}) if rec_engine else {}
        item = dict(r)
        item["title"] = movie_meta.get("title", f"Movie #{m_id}")
        item["release_year"] = movie_meta.get("release_year")
        item["genres"] = movie_meta.get("genres", [])
        item["avg_rating"] = movie_meta.get("avg_rating")
        enriched.append(item)

    return jsonify({"ratings": enriched, "profile_id": profile_id}), 200


@app.route("/api/ratings", methods=["POST"])
def save_user_rating():
    data = request.get_json(silent=True) or {}
    movie_id = data.get("movie_id")
    rating = data.get("rating")
    profile_id = get_active_profile_id()

    if movie_id is None or rating is None:
        return jsonify({"error": "Fields 'movie_id' and 'rating' are required."}), 400

    try:
        movie_id = int(movie_id)
        rating = float(rating)
        if rec_engine and movie_id not in rec_engine.movie_records:
            return jsonify({"error": f"Movie ID {movie_id} does not exist in dataset."}), 404

        saved = db.save_rating(profile_id, movie_id, rating)
        return jsonify({"message": "Rating saved successfully", "rating": saved}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to persist rating: {str(e)}"}), 500


@app.route("/api/ratings/<int:movie_id>", methods=["DELETE"])
def delete_user_rating(movie_id: int):
    profile_id = get_active_profile_id()
    deleted = db.delete_rating(profile_id, movie_id)
    if deleted:
        return jsonify({"message": f"Rating for movie {movie_id} deleted."}), 200
    return jsonify({"error": f"No rating found for movie {movie_id}."}), 404


# -------------------------------------------------------------
# 5. Watchlist (CRUD)
# -------------------------------------------------------------
@app.route("/api/watchlist", methods=["GET"])
def get_watchlist():
    profile_id = get_active_profile_id()
    items = db.get_watchlist(profile_id)

    enriched = []
    for w in items:
        m_id = w["movie_id"]
        meta = rec_engine.movie_records.get(m_id, {}) if rec_engine else {}
        entry = dict(w)
        entry["title"] = meta.get("title", f"Movie #{m_id}")
        entry["release_year"] = meta.get("release_year")
        entry["genres"] = meta.get("genres", [])
        entry["avg_rating"] = meta.get("avg_rating")
        entry["ratings_count"] = meta.get("ratings_count", 0)
        enriched.append(entry)

    return jsonify({"watchlist": enriched, "profile_id": profile_id}), 200


@app.route("/api/watchlist", methods=["POST"])
def add_to_watchlist():
    data = request.get_json(silent=True) or {}
    movie_id = data.get("movie_id")
    profile_id = get_active_profile_id()

    if movie_id is None:
        return jsonify({"error": "Field 'movie_id' is required."}), 400

    try:
        movie_id = int(movie_id)
        if rec_engine and movie_id not in rec_engine.movie_records:
            return jsonify({"error": f"Movie ID {movie_id} not found."}), 404

        item = db.add_to_watchlist(profile_id, movie_id)
        return jsonify({"message": "Added to watchlist", "item": item}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/watchlist/<int:movie_id>", methods=["DELETE"])
def remove_from_watchlist(movie_id: int):
    profile_id = get_active_profile_id()
    removed = db.remove_from_watchlist(profile_id, movie_id)
    if removed:
        return jsonify({"message": f"Movie {movie_id} removed from watchlist."}), 200
    return jsonify({"error": f"Movie {movie_id} was not in watchlist."}), 404


# -------------------------------------------------------------
# 6. Preferences
# -------------------------------------------------------------
@app.route("/api/preferences", methods=["GET"])
def get_preferences():
    profile_id = get_active_profile_id()
    prefs = db.get_preferences(profile_id)

    # Attach full favorite movie metadata for UI pills
    fav_details = []
    if rec_engine:
        for mid in prefs.get("favorite_movies", []):
            if mid in rec_engine.movie_records:
                fav_details.append(rec_engine.movie_records[mid])

    return jsonify({
        "preferences": prefs,
        "favorite_movies_details": fav_details
    }), 200


@app.route("/api/preferences", methods=["POST"])
def save_preferences():
    data = request.get_json(silent=True) or {}
    profile_id = get_active_profile_id()

    preferred_genres = data.get("preferred_genres", [])
    favorite_movies = data.get("favorite_movies", [])

    if not isinstance(preferred_genres, list) or not isinstance(favorite_movies, list):
        return jsonify({"error": "preferred_genres and favorite_movies must be lists."}), 400

    try:
        saved = db.save_preferences(profile_id, preferred_genres, favorite_movies)
        return jsonify({"message": "Preferences saved successfully", "preferences": saved}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------------------
# 7. Analytics & Dashboard Metrics
# -------------------------------------------------------------
@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    profile_id = get_active_profile_id()
    profile_stats = db.get_profile_analytics(profile_id)

    # Catalogue stats
    total_movies = len(movies_df) if movies_df is not None else 0
    total_ratings_dataset = len(ratings_df) if ratings_df is not None else 0

    # User favorite genres based on rated movies >= 3.5
    user_ratings = db.get_ratings(profile_id)
    genre_counts: Dict[str, int] = {}
    for r in user_ratings:
        if r["rating"] >= 3.0 and rec_engine and r["movie_id"] in rec_engine.movie_records:
            for g in rec_engine.movie_records[r["movie_id"]]["genres"]:
                genre_counts[g] = genre_counts.get(g, 0) + 1

    top_user_genres = sorted(
        [{"genre": k, "count": v} for k, v in genre_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]

    # Overall dataset genre distribution
    dataset_genres: Dict[str, int] = {}
    if movies_df is not None:
        for genres in movies_df["genre_list"]:
            for g in genres:
                dataset_genres[g] = dataset_genres.get(g, 0) + 1

    dataset_genres_top = sorted(
        [{"genre": k, "count": v} for k, v in dataset_genres.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    return jsonify({
        "total_movies_available": total_movies,
        "total_dataset_ratings": total_ratings_dataset,
        "user_ratings_count": profile_stats["total_ratings"],
        "user_avg_rating": profile_stats["average_user_rating"],
        "watchlist_size": profile_stats["watchlist_count"],
        "user_rating_distribution": profile_stats["rating_distribution"],
        "top_user_genres": top_user_genres,
        "dataset_genre_distribution": dataset_genres_top,
        "profile_id": profile_id
    }), 200


# -------------------------------------------------------------
# 8. Evaluation Metrics
# -------------------------------------------------------------
@app.route("/api/evaluation", methods=["GET"])
def get_evaluation():
    if rec_engine is None:
        return jsonify({"error": "Engine not initialized"}), 503

    k = min(20, max(1, request.args.get("k", 10, type=int)))
    eval_result = rec_engine.evaluate_recommendations(k=k)
    return jsonify(eval_result), 200


# -------------------------------------------------------------
# 9. Profile Management
# -------------------------------------------------------------
@app.route("/api/profiles", methods=["GET"])
def list_profiles():
    profiles = db.list_profiles()
    return jsonify({"profiles": profiles}), 200


# -------------------------------------------------------------
# 10. Simple & Uncomplicated User Authentication
# -------------------------------------------------------------
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password")

    if not username:
        return jsonify({"error": "Please enter your username or name."}), 400

    try:
        user = db.login_user(username, password)
        return jsonify({
            "message": f"Welcome back, {user['display_name']}!",
            "user": user
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    display_name = (data.get("display_name") or "").strip()
    password = data.get("password")

    if not username:
        return jsonify({"error": "Username is required."}), 400

    try:
        user = db.register_user(username, display_name or username.title(), password)
        return jsonify({
            "message": f"Account created! Welcome, {user['display_name']}.",
            "user": user
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    profile_id = get_active_profile_id()
    profile = db.get_or_create_profile(profile_id)
    is_guest = (profile_id == "guest_default")
    return jsonify({
        "user": {
            "profile_id": profile["profile_id"],
            "display_name": profile["display_name"],
            "is_guest": is_guest
        }
    }), 200


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5001))
    print(f"Starting CineMatch AI Flask Server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
