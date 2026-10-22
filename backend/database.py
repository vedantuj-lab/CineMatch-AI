"""
CineMatch AI — Database Module (SQLite)
Manages persistent user profiles, ratings, watchlist items, and recommendation preferences.
Uses parameterized queries with strict validation and relational constraints.
"""

import os
import re
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from werkzeug.security import generate_password_hash, check_password_hash

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "cinematch.db")


class Database:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        """Initializes tables and default guest profile."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # User Profiles table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                profile_id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                password_hash TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            try:
                cursor.execute("ALTER TABLE user_profiles ADD COLUMN password_hash TEXT DEFAULT '';")
            except Exception:
                pass

            # Ratings table (0.5 to 5.0)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS ratings (
                profile_id TEXT NOT NULL,
                movie_id INTEGER NOT NULL,
                rating REAL NOT NULL CHECK(rating >= 0.5 AND rating <= 5.0),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (profile_id, movie_id),
                FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE
            );
            """)

            # Watchlist table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
                profile_id TEXT NOT NULL,
                movie_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (profile_id, movie_id),
                FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE
            );
            """)

            # Preferences table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS preferences (
                profile_id TEXT PRIMARY KEY,
                preferred_genres TEXT NOT NULL DEFAULT '[]',
                favorite_movies TEXT NOT NULL DEFAULT '[]',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE
            );
            """)

            # Seed default guest profile if absent
            cursor.execute("SELECT profile_id FROM user_profiles WHERE profile_id = ?", ("guest_default",))
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO user_profiles (profile_id, display_name) VALUES (?, ?)",
                    ("guest_default", "Guest Explorer")
                )
                cursor.execute(
                    "INSERT INTO preferences (profile_id, preferred_genres, favorite_movies) VALUES (?, ?, ?)",
                    ("guest_default", json.dumps(["Action", "Sci-Fi", "Drama"]), json.dumps([1, 260, 296]))
                )
            conn.commit()

    # --- Profile Methods ---
    def get_or_create_profile(self, profile_id: str, display_name: Optional[str] = None) -> Dict[str, Any]:
        profile_id = (profile_id or "guest_default").strip()
        display_name = (display_name or profile_id.replace("_", " ").title()).strip()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT profile_id, display_name, created_at FROM user_profiles WHERE profile_id = ?", (profile_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)

            cursor.execute(
                "INSERT INTO user_profiles (profile_id, display_name) VALUES (?, ?)",
                (profile_id, display_name)
            )
            cursor.execute(
                "INSERT OR IGNORE INTO preferences (profile_id, preferred_genres, favorite_movies) VALUES (?, '[]', '[]')",
                (profile_id,)
            )
            conn.commit()
            return {"profile_id": profile_id, "display_name": display_name, "created_at": datetime.utcnow().isoformat()}

    def list_profiles(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT profile_id, display_name, created_at FROM user_profiles ORDER BY created_at ASC")
            return [dict(row) for row in cursor.fetchall()]

    def register_user(self, username: str, display_name: Optional[str] = None, password: Optional[str] = None) -> Dict[str, Any]:
        username = (username or "").strip().lower()
        if not username:
            raise ValueError("Username cannot be empty.")

        clean_id = re.sub(r"[^a-z0-9_]", "_", username).strip("_")
        if not clean_id:
            clean_id = "user_" + str(int(datetime.utcnow().timestamp()))

        disp_name = (display_name or username.title()).strip()
        pwd_hash = generate_password_hash(password) if password else ""

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT profile_id FROM user_profiles WHERE profile_id = ?", (clean_id,))
            if cursor.fetchone():
                raise ValueError(f"Username '{username}' already exists. Please sign in.")

            cursor.execute(
                "INSERT INTO user_profiles (profile_id, display_name, password_hash) VALUES (?, ?, ?)",
                (clean_id, disp_name, pwd_hash)
            )
            cursor.execute(
                "INSERT OR IGNORE INTO preferences (profile_id, preferred_genres, favorite_movies) VALUES (?, '[]', '[]')",
                (clean_id,)
            )
            conn.commit()

        return {"profile_id": clean_id, "display_name": disp_name, "is_authenticated": True}

    def login_user(self, username: str, password: Optional[str] = None) -> Dict[str, Any]:
        username = (username or "").strip().lower()
        if not username:
            raise ValueError("Please provide a username.")

        clean_id = re.sub(r"[^a-z0-9_]", "_", username).strip("_")

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT profile_id, display_name, password_hash FROM user_profiles WHERE profile_id = ?", (clean_id,))
            row = cursor.fetchone()

            if not row:
                # Uncomplicated workflow: automatically register new user!
                return self.register_user(clean_id, username.title(), password)

            stored_hash = row["password_hash"]
            if stored_hash and password:
                if not check_password_hash(stored_hash, password):
                    raise ValueError("Incorrect password for this user account.")
            elif not stored_hash and password:
                new_hash = generate_password_hash(password)
                cursor.execute("UPDATE user_profiles SET password_hash = ? WHERE profile_id = ?", (new_hash, clean_id))
                conn.commit()

            return {"profile_id": row["profile_id"], "display_name": row["display_name"], "is_authenticated": True}

    # --- Ratings Methods ---
    def save_rating(self, profile_id: str, movie_id: int, rating: float) -> Dict[str, Any]:
        profile_id = (profile_id or "guest_default").strip()
        movie_id = int(movie_id)
        rating = float(rating)

        if rating < 0.5 or rating > 5.0:
            raise ValueError(f"Rating {rating} must be between 0.5 and 5.0 stars.")

        # Round to nearest 0.5
        rating = round(rating * 2) / 2

        self.get_or_create_profile(profile_id)

        now = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ratings (profile_id, movie_id, rating, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(profile_id, movie_id) DO UPDATE SET
                    rating = excluded.rating,
                    updated_at = excluded.updated_at
            """, (profile_id, movie_id, rating, now))
            conn.commit()

        return {"profile_id": profile_id, "movie_id": movie_id, "rating": rating, "updated_at": now}

    def get_ratings(self, profile_id: str) -> List[Dict[str, Any]]:
        profile_id = (profile_id or "guest_default").strip()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT profile_id, movie_id, rating, updated_at
                FROM ratings
                WHERE profile_id = ?
                ORDER BY updated_at DESC
            """, (profile_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_rating_for_movie(self, profile_id: str, movie_id: int) -> Optional[float]:
        profile_id = (profile_id or "guest_default").strip()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT rating FROM ratings
                WHERE profile_id = ? AND movie_id = ?
            """, (profile_id, int(movie_id)))
            row = cursor.fetchone()
            return float(row["rating"]) if row else None

    def delete_rating(self, profile_id: str, movie_id: int) -> bool:
        profile_id = (profile_id or "guest_default").strip()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM ratings WHERE profile_id = ? AND movie_id = ?", (profile_id, int(movie_id)))
            deleted = cursor.rowcount > 0
            conn.commit()
            return deleted

    # --- Watchlist Methods ---
    def add_to_watchlist(self, profile_id: str, movie_id: int) -> Dict[str, Any]:
        profile_id = (profile_id or "guest_default").strip()
        movie_id = int(movie_id)
        self.get_or_create_profile(profile_id)

        now = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR IGNORE INTO watchlist (profile_id, movie_id, created_at)
                VALUES (?, ?, ?)
            """, (profile_id, movie_id, now))
            conn.commit()

        return {"profile_id": profile_id, "movie_id": movie_id, "created_at": now}

    def remove_from_watchlist(self, profile_id: str, movie_id: int) -> bool:
        profile_id = (profile_id or "guest_default").strip()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM watchlist WHERE profile_id = ? AND movie_id = ?", (profile_id, int(movie_id)))
            removed = cursor.rowcount > 0
            conn.commit()
            return removed

    def get_watchlist(self, profile_id: str) -> List[Dict[str, Any]]:
        profile_id = (profile_id or "guest_default").strip()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT profile_id, movie_id, created_at
                FROM watchlist
                WHERE profile_id = ?
                ORDER BY created_at DESC
            """, (profile_id,))
            return [dict(row) for row in cursor.fetchall()]

    def is_in_watchlist(self, profile_id: str, movie_id: int) -> bool:
        profile_id = (profile_id or "guest_default").strip()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM watchlist WHERE profile_id = ? AND movie_id = ?", (profile_id, int(movie_id)))
            return cursor.fetchone() is not None

    # --- Preferences Methods ---
    def get_preferences(self, profile_id: str) -> Dict[str, Any]:
        profile_id = (profile_id or "guest_default").strip()
        self.get_or_create_profile(profile_id)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT profile_id, preferred_genres, favorite_movies, updated_at
                FROM preferences
                WHERE profile_id = ?
            """, (profile_id,))
            row = cursor.fetchone()
            if row:
                try:
                    genres = json.loads(row["preferred_genres"])
                except Exception:
                    genres = []
                try:
                    favs = json.loads(row["favorite_movies"])
                except Exception:
                    favs = []
                return {
                    "profile_id": row["profile_id"],
                    "preferred_genres": genres,
                    "favorite_movies": favs,
                    "updated_at": row["updated_at"]
                }
            return {
                "profile_id": profile_id,
                "preferred_genres": [],
                "favorite_movies": [],
                "updated_at": datetime.utcnow().isoformat()
            }

    def save_preferences(self, profile_id: str, preferred_genres: List[str], favorite_movies: List[int]) -> Dict[str, Any]:
        profile_id = (profile_id or "guest_default").strip()
        self.get_or_create_profile(profile_id)

        genres_json = json.dumps(list(set(preferred_genres or [])))
        favs_json = json.dumps([int(m) for m in (favorite_movies or [])])
        now = datetime.utcnow().isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO preferences (profile_id, preferred_genres, favorite_movies, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(profile_id) DO UPDATE SET
                    preferred_genres = excluded.preferred_genres,
                    favorite_movies = excluded.favorite_movies,
                    updated_at = excluded.updated_at
            """, (profile_id, genres_json, favs_json, now))
            conn.commit()

        return {
            "profile_id": profile_id,
            "preferred_genres": json.loads(genres_json),
            "favorite_movies": json.loads(favs_json),
            "updated_at": now
        }

    # --- Analytics Helper Methods ---
    def get_profile_analytics(self, profile_id: str) -> Dict[str, Any]:
        profile_id = (profile_id or "guest_default").strip()
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Rating distribution (0.5 to 5.0)
            cursor.execute("""
                SELECT rating, COUNT(*) as count
                FROM ratings
                WHERE profile_id = ?
                GROUP BY rating
                ORDER BY rating ASC
            """, (profile_id,))
            distribution = {f"{r:.1f}": 0 for r in [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]}
            total_ratings = 0
            rating_sum = 0.0
            for row in cursor.fetchall():
                r_key = f"{float(row['rating']):.1f}"
                cnt = int(row["count"])
                distribution[r_key] = cnt
                total_ratings += cnt
                rating_sum += float(row["rating"]) * cnt

            # Watchlist count
            cursor.execute("SELECT COUNT(*) as count FROM watchlist WHERE profile_id = ?", (profile_id,))
            w_row = cursor.fetchone()
            watchlist_count = int(w_row["count"]) if w_row else 0

            avg_rating = round(rating_sum / total_ratings, 2) if total_ratings > 0 else 0.0

            return {
                "total_ratings": total_ratings,
                "average_user_rating": avg_rating,
                "watchlist_count": watchlist_count,
                "rating_distribution": [{"rating": float(k), "count": v} for k, v in distribution.items()]
            }
