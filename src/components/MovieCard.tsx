import React, { useState } from 'react';
import { Bookmark, Star, Film, Eye, Sparkles } from 'lucide-react';
import { Movie } from '../types/movie';
import { getMoviePalette, getDeterministicNumber } from '../utils/poster';
import { RatingStars } from './RatingStars';

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  onToggleWatchlist?: (movie: Movie) => void;
  onRate?: (movie: Movie, rating: number) => void;
  explanation?: string;
  scoreBadge?: string;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onSelect,
  onToggleWatchlist,
  onRate,
  explanation,
  scoreBadge,
}) => {
  const [showRatingPopover, setShowRatingPopover] = useState(false);
  const palette = getMoviePalette(movie.genres);
  const patternSeed = getDeterministicNumber(movie.title);

  return (
    <div
      onClick={() => onSelect(movie)}
      className="group relative flex flex-col bg-[#14161F] border border-white/5 hover:border-amber-500/30 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.6)] hover:shadow-amber-500/5 text-zinc-100"
    >
      {/* Poster Artwork Area */}
      <div className={`relative aspect-[2/3] w-full bg-gradient-to-br ${palette.bg} overflow-hidden p-5 flex flex-col justify-between select-none`}>
        {/* Subtle decorative geometric lines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`grid-${movie.movieId}`} width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${movie.movieId})`} />
          </svg>
        </div>

        {/* Top Badges & Actions */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          {/* Year Badge */}
          {movie.release_year ? (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/60 backdrop-blur-md text-amber-200/90 border border-white/10">
              {movie.release_year}
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/60 backdrop-blur-md text-zinc-400 border border-white/10">
              Classic
            </span>
          )}

          {/* Watchlist Toggle */}
          {onToggleWatchlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(movie);
              }}
              className={`p-2 rounded-xl backdrop-blur-md transition-all duration-200 border ${
                movie.is_in_watchlist
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/30'
                  : 'bg-black/60 text-zinc-300 hover:text-white border-white/10 hover:bg-black/80'
              }`}
              title={movie.is_in_watchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Bookmark className={`w-4 h-4 ${movie.is_in_watchlist ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Center Artistic Icon & Title Monogram */}
        <div className="relative z-10 my-auto text-center py-4">
          <div
            className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-inner border border-white/10 backdrop-blur-sm transform group-hover:scale-110 transition-transform duration-300"
            style={{ backgroundColor: `${palette.accent}20` }}
          >
            <Film className="w-8 h-8 opacity-80" style={{ color: palette.accent }} />
          </div>
          <span className="text-2xl font-black font-['Space_Grotesk'] tracking-wider uppercase opacity-40">
            {movie.title.slice(0, 2)}
          </span>
        </div>

        {/* Bottom Poster Overlay */}
        <div className="relative z-10">
          {scoreBadge && (
            <div className="mb-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {scoreBadge}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-zinc-300">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-bold text-white">{movie.avg_rating > 0 ? movie.avg_rating.toFixed(1) : 'NR'}</span>
              {movie.ratings_count > 0 && (
                <span className="text-zinc-400 text-[10px]">({movie.ratings_count})</span>
              )}
            </div>

            {movie.user_rating && (
              <span className="px-2 py-1 rounded-md bg-amber-500/30 text-amber-300 font-semibold border border-amber-400/40 text-[11px]">
                You: {movie.user_rating.toFixed(1)}★
              </span>
            )}
          </div>
        </div>

        {/* Hover quick action overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-md flex items-center gap-1 border border-white/20 shadow-xl">
            <Eye className="w-3.5 h-3.5" />
            Explore Movie
          </span>
        </div>
      </div>

      {/* Card Content Footer */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-100 text-base leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors">
            {movie.title}
          </h3>

          {/* Genre Tags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {movie.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 border border-white/5"
              >
                {g}
              </span>
            ))}
            {movie.genres.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-400">
                +{movie.genres.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Explanation callout if provided */}
        {explanation && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs leading-relaxed">
            <span className="font-medium text-amber-300">Why recommended: </span>
            {explanation}
          </div>
        )}

        {/* Quick Rate bar */}
        {onRate && (
          <div
            className="pt-2 border-t border-white/5 flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-zinc-400">Your rating:</span>
            <RatingStars
              value={movie.user_rating}
              size="sm"
              onChange={(newRating) => onRate(movie, newRating)}
              onClear={() => onRate(movie, 0)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
