/**
 * CineMatch AI — Centralized API Client
 * Interacts with Flask backend endpoints via /api.
 */

import {
  Movie,
  RecommendationItem,
  UserRating,
  WatchlistItem,
  UserPreferences,
  UserProfile,
  AnalyticsData,
  EvaluationData,
} from '../types/movie';

const PROFILE_KEY = 'cinematch_active_profile';

export function getActiveProfileId(): string {
  try {
    return localStorage.getItem(PROFILE_KEY) || 'guest_default';
  } catch {
    return 'guest_default';
  }
}

export function setActiveProfileId(profileId: string) {
  try {
    localStorage.setItem(PROFILE_KEY, profileId.trim().toLowerCase());
  } catch {
    // Ignore storage errors
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const profileId = getActiveProfileId();
  const headers = {
    'Content-Type': 'application/json',
    'X-Profile-Id': profileId,
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.error) errorMsg = errData.error;
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; movies_indexed: number; ratings_count: number }>('/api/health'),

  // Movies Catalogue
  getMovies: (params: {
    query?: string;
    genre?: string;
    min_year?: number;
    max_year?: number;
    sort_by?: string;
    order?: string;
    page?: number;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params.query) sp.append('query', params.query);
    if (params.genre && params.genre !== 'All') sp.append('genre', params.genre);
    if (params.min_year) sp.append('min_year', String(params.min_year));
    if (params.max_year) sp.append('max_year', String(params.max_year));
    if (params.sort_by) sp.append('sort_by', params.sort_by);
    if (params.order) sp.append('order', params.order);
    if (params.page) sp.append('page', String(params.page));
    if (params.limit) sp.append('limit', String(params.limit));

    return request<{
      movies: Movie[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>(`/api/movies?${sp.toString()}`);
  },

  getMovie: (id: number) => request<Movie & { similar_movies: RecommendationItem[] }>(`/api/movies/${id}`),

  getGenres: () => request<{ genres: string[] }>('/api/genres'),

  // Recommendations
  getContentRecommendations: (movieId: number, topK: number = 8) =>
    request<{
      target_movie: Movie;
      recommendations: RecommendationItem[];
      algorithm: string;
      count: number;
    }>(`/api/recommendations/${movieId}?top_k=${topK}`),

  getPersonalizedRecommendations: (payload: {
    favorite_movies?: number[];
    preferred_genres?: string[];
    method?: 'content' | 'collaborative';
    exclude_rated?: boolean;
    exclude_watchlist?: boolean;
    content_weight?: number;
    genre_weight?: number;
    rating_quality_weight?: number;
    top_k?: number;
  }) =>
    request<{
      method: string;
      recommendations: RecommendationItem[];
      favorite_movies_count?: number;
      preferred_genres?: string[];
      profile_id: string;
    }>('/api/recommendations/personalized', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Ratings
  getRatings: () => request<{ ratings: UserRating[]; profile_id: string }>('/api/ratings'),

  saveRating: (movieId: number, rating: number) =>
    request<{ message: string; rating: UserRating }>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify({ movie_id: movieId, rating }),
    }),

  deleteRating: (movieId: number) =>
    request<{ message: string }>(`/api/ratings/${movieId}`, {
      method: 'DELETE',
    }),

  // Watchlist
  getWatchlist: () => request<{ watchlist: WatchlistItem[]; profile_id: string }>('/api/watchlist'),

  addToWatchlist: (movieId: number) =>
    request<{ message: string; item: WatchlistItem }>('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ movie_id: movieId }),
    }),

  removeFromWatchlist: (movieId: number) =>
    request<{ message: string }>(`/api/watchlist/${movieId}`, {
      method: 'DELETE',
    }),

  // Preferences
  getPreferences: () =>
    request<{
      preferences: UserPreferences;
      favorite_movies_details: Movie[];
    }>('/api/preferences'),

  savePreferences: (preferred_genres: string[], favorite_movies: number[]) =>
    request<{ message: string; preferences: UserPreferences }>('/api/preferences', {
      method: 'POST',
      body: JSON.stringify({ preferred_genres, favorite_movies }),
    }),

  // Analytics & Evaluation
  getAnalytics: () => request<AnalyticsData>('/api/analytics'),

  getEvaluation: (k: number = 10) => request<EvaluationData>(`/api/evaluation?k=${k}`),

  // Profiles
  getProfiles: () => request<{ profiles: UserProfile[] }>('/api/profiles'),

  createProfile: (profileId: string, displayName?: string) =>
    request<{ profile: UserProfile }>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ profile_id: profileId, display_name: displayName }),
    }),

  // Authentication
  login: (username: string, password?: string) =>
    request<{ message: string; user: { profile_id: string; display_name: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, displayName?: string, password?: string) =>
    request<{ message: string; user: { profile_id: string; display_name: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, display_name: displayName, password }),
    }),

  getMe: () =>
    request<{ user: { profile_id: string; display_name: string; is_guest: boolean } }>('/api/auth/me'),

  logout: () => {
    setActiveProfileId('guest_default');
  },
};
