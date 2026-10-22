export interface Movie {
  movieId: number;
  title: string;
  full_title?: string;
  release_year: number | null;
  genres: string[];
  genres_display: string;
  avg_rating: number;
  ratings_count: number;
  tags?: string[];
  imdbId?: string | null;
  tmdbId?: string | null;
  user_rating?: number | null;
  is_in_watchlist?: boolean;
}

export interface RecommendationItem extends Movie {
  similarity_score?: number;
  recommendation_score?: number;
  predicted_rating?: number;
  content_similarity?: number;
  genre_match?: number;
  explanation: string;
  algorithm: string;
}

export interface UserRating {
  profile_id: string;
  movie_id: number;
  rating: number;
  updated_at: string;
  title?: string;
  release_year?: number | null;
  genres?: string[];
  avg_rating?: number;
}

export interface WatchlistItem {
  profile_id: string;
  movie_id: number;
  created_at: string;
  title?: string;
  release_year?: number | null;
  genres?: string[];
  avg_rating?: number;
  ratings_count?: number;
}

export interface UserPreferences {
  profile_id: string;
  preferred_genres: string[];
  favorite_movies: number[];
  updated_at: string;
}

export interface UserProfile {
  profile_id: string;
  display_name: string;
  created_at: string;
}

export interface AnalyticsData {
  total_movies_available: number;
  total_dataset_ratings: number;
  user_ratings_count: number;
  user_avg_rating: number;
  watchlist_size: number;
  user_rating_distribution: { rating: number; count: number }[];
  top_user_genres: { genre: string; count: number }[];
  dataset_genre_distribution: { genre: string; count: number }[];
  profile_id: string;
}

export interface EvaluationData {
  test_user_id: number;
  train_ratings_count: number;
  test_ratings_count: number;
  ground_truth_relevant_count: number;
  k: number;
  hits: number;
  precision_at_k: number;
  recall_at_k: number;
  recommended_titles: string[];
}
