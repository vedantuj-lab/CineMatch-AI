import React, { useEffect, useState } from 'react';
import { X, Star, Bookmark, Calendar, Film, ExternalLink, Sparkles, Tag, Users } from 'lucide-react';
import { Movie, RecommendationItem } from '../types/movie';
import { RatingStars } from './RatingStars';
import { getMoviePalette } from '../utils/poster';
import { api } from '../api/client';

interface MovieDetailsModalProps {
  movie: Movie | null;
  onClose: () => void;
  onRateMovie: (movie: Movie, rating: number) => void;
  onToggleWatchlist: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie,
  onClose,
  onRateMovie,
  onToggleWatchlist,
  onSelectMovie,
}) => {
  const [details, setDetails] = useState<(Movie & { similar_movies: RecommendationItem[] }) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!movie) {
      setDetails(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api
      .getMovie(movie.movieId)
      .then((data) => {
        if (isMounted) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch details:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [movie]);

  if (!movie) return null;

  const currentMovie = details || movie;
  const palette = getMoviePalette(currentMovie.genres);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#12141D] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col my-auto text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Banner */}
        <div className={`relative w-full bg-gradient-to-r ${palette.bg} p-6 sm:p-8 overflow-hidden`}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-black/50 hover:bg-black/80 text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
            {/* Visual Mini Poster */}
            <div className="w-28 sm:w-36 aspect-[2/3] rounded-2xl bg-black/40 border border-white/10 p-4 flex flex-col justify-between shadow-2xl flex-shrink-0">
              <span className="text-xs font-mono text-amber-300/80">#{currentMovie.movieId}</span>
              <div className="text-center my-auto">
                <Film className="w-8 h-8 mx-auto opacity-70 mb-1" style={{ color: palette.accent }} />
                <span className="text-xl font-bold font-['Space_Grotesk'] opacity-50 uppercase">
                  {currentMovie.title.slice(0, 2)}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 text-center font-semibold">
                {currentMovie.release_year || 'MovieLens'}
              </span>
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {currentMovie.release_year && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/10 text-amber-200">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {currentMovie.release_year}
                  </span>
                )}
                {currentMovie.genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] leading-tight">
                {currentMovie.title}
              </h2>

              {currentMovie.full_title && currentMovie.full_title !== currentMovie.title && (
                <p className="text-xs text-zinc-400 italic">Original record: {currentMovie.full_title}</p>
              )}

              {/* Ratings and Stats Banner */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-white text-base">
                    {currentMovie.avg_rating > 0 ? currentMovie.avg_rating.toFixed(1) : 'NR'}
                  </span>
                  <span className="text-zinc-400 text-xs">/ 5.0</span>
                  {currentMovie.ratings_count > 0 && (
                    <span className="text-zinc-400 text-xs flex items-center gap-1 border-l border-white/10 pl-2">
                      <Users className="w-3 h-3" />
                      {currentMovie.ratings_count.toLocaleString()} votes
                    </span>
                  )}
                </div>

                {/* External IMDb link if available */}
                {currentMovie.imdbId && (
                  <a
                    href={`https://www.imdb.com/title/tt${String(currentMovie.imdbId).padStart(7, '0')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-zinc-950 font-bold text-xs hover:bg-amber-300 transition-colors shadow-sm"
                  >
                    <span>IMDb</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Action Row: Personal Rating & Watchlist */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400 font-medium">Your personal score:</span>
              <RatingStars
                value={currentMovie.user_rating}
                size="lg"
                onChange={(rating) => onRateMovie(currentMovie, rating)}
                onClear={() => onRateMovie(currentMovie, 0)}
              />
            </div>

            <button
              onClick={() => onToggleWatchlist(currentMovie)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-md ${
                currentMovie.is_in_watchlist
                  ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${currentMovie.is_in_watchlist ? 'fill-current' : ''}`} />
              {currentMovie.is_in_watchlist ? 'In Watchlist' : 'Add to Watchlist'}
            </button>
          </div>

          {/* Community Tags section from tags.csv */}
          {currentMovie.tags && currentMovie.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                Community Tags ({currentMovie.tags.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {currentMovie.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-lg bg-white/5 text-zinc-300 text-xs border border-white/5 hover:border-amber-500/30 transition-colors"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Similar Movies Section (Content-Based Recommendations) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Similar Movies (Content-Based Filtering)
                </h4>
                <p className="text-xs text-zinc-400">
                  Calculated using TF-IDF vectorization & Cosine similarity over genres, title semantics, and tags.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/5" />
                ))}
              </div>
            ) : details?.similar_movies && details.similar_movies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {details.similar_movies.map((sim) => (
                  <div
                    key={sim.movieId}
                    onClick={() => {
                      onSelectMovie(sim);
                    }}
                    className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h5 className="font-semibold text-sm text-zinc-100 hover:text-amber-400 line-clamp-1">
                          {sim.title}
                        </h5>
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          {Math.round((sim.similarity_score || 0) * 100)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{sim.genres.slice(0, 2).join(', ')}</p>
                    </div>

                    <div className="text-[11px] text-amber-200/80 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 line-clamp-2">
                      {sim.explanation}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] text-xs text-zinc-400 text-center">
                No similar titles found for this specific entry.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
