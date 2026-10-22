import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  Plus,
  X,
  Search,
  Check,
  TrendingUp,
  Layers,
  Info,
  RotateCcw,
} from 'lucide-react';
import { Movie, RecommendationItem } from '../types/movie';
import { MovieCard } from '../components/MovieCard';
import { api } from '../api/client';

interface RecommendationsPageProps {
  onSelectMovie: (movie: Movie) => void;
  onToggleWatchlist: (movie: Movie) => void;
  onRateMovie: (movie: Movie, rating: number) => void;
}

export const RecommendationsPage: React.FC<RecommendationsPageProps> = ({
  onSelectMovie,
  onToggleWatchlist,
  onRateMovie,
}) => {
  // Wizard state
  const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);
  const [preferredGenres, setPreferredGenres] = useState<string[]>(['Sci-Fi', 'Action']);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [method, setMethod] = useState<'content' | 'collaborative'>('content');

  // Tunable weights
  const [contentWeight, setContentWeight] = useState(0.55);
  const [genreWeight, setGenreWeight] = useState(0.3);
  const [ratingQualityWeight, setRatingQualityWeight] = useState(0.15);

  // Exclusions
  const [excludeRated, setExcludeRated] = useState(true);
  const [excludeWatchlist, setExcludeWatchlist] = useState(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search for adding favorites
  const [favSearchQuery, setFavSearchQuery] = useState('');
  const [favSearchResults, setFavSearchResults] = useState<Movie[]>([]);
  const [isSearchingFavs, setIsSearchingFavs] = useState(false);

  // Initialize genres and stored preferences
  useEffect(() => {
    api.getGenres().then((res) => {
      setAvailableGenres(res.genres);
    });

    api.getPreferences().then((res) => {
      if (res.preferences.preferred_genres?.length) {
        setPreferredGenres(res.preferences.preferred_genres);
      }
      if (res.favorite_movies_details?.length) {
        setFavoriteMovies(res.favorite_movies_details);
      } else {
        // Default classics
        api.getMovies({ limit: 3, sort_by: 'ratings_count' }).then((mRes) => {
          setFavoriteMovies(mRes.movies.slice(0, 3));
        });
      }
    });
  }, []);

  // Search movies for favorite selection
  useEffect(() => {
    if (!favSearchQuery.trim()) {
      setFavSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearchingFavs(true);
      api
        .getMovies({ query: favSearchQuery.trim(), limit: 6 })
        .then((res) => {
          setFavSearchResults(res.movies);
          setIsSearchingFavs(false);
        })
        .catch(() => setIsSearchingFavs(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [favSearchQuery]);

  const handleAddFavorite = (m: Movie) => {
    if (favoriteMovies.some((f) => f.movieId === m.movieId)) return;
    const updated = [...favoriteMovies, m];
    setFavoriteMovies(updated);
    setFavSearchQuery('');
    setFavSearchResults([]);
    // Persist to SQLite
    api.savePreferences(
      preferredGenres,
      updated.map((x) => x.movieId)
    );
  };

  const handleRemoveFavorite = (movieId: number) => {
    const updated = favoriteMovies.filter((f) => f.movieId !== movieId);
    setFavoriteMovies(updated);
    api.savePreferences(
      preferredGenres,
      updated.map((x) => x.movieId)
    );
  };

  const handleToggleGenre = (g: string) => {
    let updated: string[];
    if (preferredGenres.includes(g)) {
      updated = preferredGenres.filter((item) => item !== g);
    } else {
      updated = [...preferredGenres, g];
    }
    setPreferredGenres(updated);
    api.savePreferences(
      updated,
      favoriteMovies.map((x) => x.movieId)
    );
  };

  const handleGenerate = () => {
    setLoading(true);
    setError(null);

    api
      .getPersonalizedRecommendations({
        favorite_movies: favoriteMovies.map((f) => f.movieId),
        preferred_genres: preferredGenres,
        method: method,
        exclude_rated: excludeRated,
        exclude_watchlist: excludeWatchlist,
        content_weight: contentWeight,
        genre_weight: genreWeight,
        rating_quality_weight: ratingQualityWeight,
        top_k: 16,
      })
      .then((res) => {
        setRecommendations(res.recommendations);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to generate recommendations');
        setLoading(false);
      });
  };

  // Run initial recommendation generation once favorite movies or genres ready
  useEffect(() => {
    if (favoriteMovies.length > 0 || preferredGenres.length > 0) {
      handleGenerate();
    }
  }, [method]);

  return (
    <div className="space-y-12 pb-24 text-zinc-100">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Machine Learning Recommendation Lab
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            Personalized Recommender
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Fine-tune content similarity, genre affinity, and community rating projections with mathematical transparency.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>{loading ? 'Calculating Vectors...' : 'Generate Recommendations'}</span>
        </button>
      </div>

      {/* Control Console (Accordion / Card Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Algorithm & Favorites Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Method Selector Tabs */}
          <div className="p-4 rounded-2xl bg-[#12141D] border border-white/5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Recommendation Algorithm Mode
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('content')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  method === 'content'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5'
                    : 'bg-black/30 border-white/5 text-zinc-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-zinc-100">Content-Based Hybrid</span>
                  {method === 'content' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-xs text-zinc-400">
                  TF-IDF vectorization & Cosine Similarity over genres, community tags, and title semantics.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMethod('collaborative')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  method === 'collaborative'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5'
                    : 'bg-black/30 border-white/5 text-zinc-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-zinc-100">Collaborative Filtering</span>
                  {method === 'collaborative' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-xs text-zinc-400">
                  Item-based rating projection from 100,000+ MovieLens user co-rating patterns.
                </p>
              </button>
            </div>
          </div>

          {/* Favorite Movies Selector */}
          <div className="p-5 rounded-2xl bg-[#12141D] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                  Favorite Anchor Movies ({favoriteMovies.length})
                </h3>
                <p className="text-xs text-zinc-400">
                  The engine extracts text features and similar item matrices from these anchors.
                </p>
              </div>
            </div>

            {/* Favorite Chips */}
            <div className="flex flex-wrap gap-2">
              {favoriteMovies.map((m) => (
                <span
                  key={m.movieId}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center gap-2 shadow-sm"
                >
                  <span>{m.title}</span>
                  {m.release_year && <span className="text-[10px] opacity-70">({m.release_year})</span>}
                  <button
                    onClick={() => handleRemoveFavorite(m.movieId)}
                    className="hover:text-red-400 p-0.5 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Search and Add Favorite Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={favSearchQuery}
                onChange={(e) => setFavSearchQuery(e.target.value)}
                placeholder="Type movie title to add as favorite anchor (e.g. Matrix, Shawshank)..."
                className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />

              {/* Autocomplete Results Dropdown */}
              {favSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#141620] border border-white/10 rounded-xl shadow-2xl p-2 z-30 max-h-56 overflow-y-auto space-y-1">
                  {favSearchResults.map((res) => {
                    const isAdded = favoriteMovies.some((f) => f.movieId === res.movieId);
                    return (
                      <div
                        key={res.movieId}
                        onClick={() => !isAdded && handleAddFavorite(res)}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isAdded ? 'opacity-40 cursor-not-allowed bg-white/5' : 'hover:bg-amber-500/10 text-zinc-200 hover:text-amber-300'
                        }`}
                      >
                        <div>
                          <span className="font-semibold">{res.title}</span>
                          <span className="text-zinc-500 text-[11px] ml-2">({res.release_year})</span>
                          <span className="text-zinc-500 text-[10px] ml-2 font-mono">{res.genres.slice(0, 2).join(', ')}</span>
                        </div>
                        <button
                          type="button"
                          className="px-2 py-1 rounded bg-amber-500 text-zinc-950 font-bold text-[10px]"
                        >
                          {isAdded ? 'Added' : 'Select'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Preferred Genres Selector */}
          <div className="p-5 rounded-2xl bg-[#12141D] border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
              Preferred Genres ({preferredGenres.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Select genres to boost in the candidate ranking function.
            </p>

            <div className="flex flex-wrap gap-2">
              {availableGenres.map((g) => {
                const isSelected = preferredGenres.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => handleToggleGenre(g)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-black/40 hover:bg-white/10 text-zinc-400 border border-white/5'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{g}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Weighting Sliders & Exclusions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weights Tuning Card */}
          <div className="p-5 rounded-2xl bg-[#12141D] border border-white/5 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Feature Weighting Scheme
              </span>
              <button
                onClick={() => {
                  setContentWeight(0.55);
                  setGenreWeight(0.3);
                  setRatingQualityWeight(0.15);
                }}
                className="text-[11px] text-zinc-400 hover:text-amber-400 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Default
              </button>
            </div>

            {method === 'content' ? (
              <div className="space-y-4">
                {/* Content Similarity Weight */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 font-medium">Favorite Content Similarity</span>
                    <span className="text-amber-400 font-mono font-bold">{Math.round(contentWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={contentWeight}
                    onChange={(e) => setContentWeight(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-black/40 rounded-lg cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-500 mt-0.5">TF-IDF metadata cosine similarity to anchor films.</p>
                </div>

                {/* Genre Match Weight */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 font-medium">Genre Preference Affinity</span>
                    <span className="text-amber-400 font-mono font-bold">{Math.round(genreWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={genreWeight}
                    onChange={(e) => setGenreWeight(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-black/40 rounded-lg cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-500 mt-0.5">Overlap proportion with user-selected genres.</p>
                </div>

                {/* Dataset Quality Regularization Weight */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 font-medium">Dataset Rating Quality</span>
                    <span className="text-amber-400 font-mono font-bold">{Math.round(ratingQualityWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ratingQualityWeight}
                    onChange={(e) => setRatingQualityWeight(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-black/40 rounded-lg cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Prevents popularity from overpowering content similarity.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                <span className="font-bold text-amber-300 flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Item-Based Collaborative Projection
                </span>
                Calculates item-to-item rating similarity vector from 610 MovieLens users. Predicts your score for unrated items using the formula:
                <code className="block mt-2 p-2 rounded bg-black/50 font-mono text-[11px] text-amber-300">
                  r̂(u, i) = Σ [ s(i, j) • r(u, j) ] / Σ |s(i, j)|
                </code>
              </div>
            )}
          </div>

          {/* Filtering & Exclusions Card */}
          <div className="p-5 rounded-2xl bg-[#12141D] border border-white/5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Candidate Pool Exclusions
            </span>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                <input
                  type="checkbox"
                  checked={excludeRated}
                  onChange={(e) => setExcludeRated(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-200 block">Exclude already rated films</span>
                  <span className="text-zinc-500 text-[11px]">Do not recommend movies you have already reviewed.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                <input
                  type="checkbox"
                  checked={excludeWatchlist}
                  onChange={(e) => setExcludeWatchlist(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-200 block">Exclude movies in watchlist</span>
                  <span className="text-zinc-500 text-[11px]">Filter out films already saved for later.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Results Section */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white font-['Space_Grotesk'] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Generated Recommendations ({recommendations.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Every card shows an algorithm-derived explanation grounded in feature overlap or collaborative co-rating patterns.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommendations.map((rec) => {
              const scoreBadge =
                rec.predicted_rating !== undefined
                  ? `${rec.predicted_rating.toFixed(1)}★ Projected`
                  : `${Math.round((rec.recommendation_score || rec.similarity_score || 0.8) * 100)}% Match`;

              return (
                <MovieCard
                  key={rec.movieId}
                  movie={rec}
                  onSelect={onSelectMovie}
                  onToggleWatchlist={onToggleWatchlist}
                  onRate={onRateMovie}
                  scoreBadge={scoreBadge}
                  explanation={rec.explanation}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-[#141620] border border-white/5 space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-amber-400/50" />
            <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
              Ready to generate your recommendations
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Select anchor favorite movies and preferred genres above, then hit Generate Recommendations.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
