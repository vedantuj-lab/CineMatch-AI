import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, Filter, Film, ArrowRight, Star } from 'lucide-react';
import { WatchlistItem, Movie } from '../types/movie';
import { api } from '../api/client';
import { MovieCard } from '../components/MovieCard';
import { NavigationTab } from '../components/Navbar';

interface WatchlistPageProps {
  onSelectMovie: (movie: Movie) => void;
  onNavigate: (tab: NavigationTab) => void;
  onRateMovie: (movie: Movie, rating: number) => void;
  onWatchlistChanged: () => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({
  onSelectMovie,
  onNavigate,
  onRateMovie,
  onWatchlistChanged,
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('All');

  const fetchWatchlist = () => {
    setLoading(true);
    api
      .getWatchlist()
      .then((res) => {
        setWatchlist(res.watchlist);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Watchlist fetch error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleRemove = (movieId: number) => {
    api.removeFromWatchlist(movieId).then(() => {
      setWatchlist((prev) => prev.filter((item) => item.movie_id !== movieId));
      onWatchlistChanged();
    });
  };

  // Derive distinct genres in watchlist
  const allGenres = Array.from(
    new Set(watchlist.flatMap((w) => w.genres || []))
  ).sort();

  const filteredItems = watchlist.filter((item) => {
    if (selectedGenre === 'All') return true;
    return item.genres?.includes(selectedGenre);
  });

  return (
    <div className="space-y-8 pb-20 text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold mb-2">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            Curated Queue
          </div>
          <h1 className="text-3xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            Your Movie Watchlist ({watchlist.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Persisted in SQLite database for your active guest profile.
          </p>
        </div>

        {watchlist.length > 0 && (
          <button
            onClick={() => onNavigate('discover')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors self-start sm:self-auto"
          >
            <span>Browse More Movies</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Genre Filter Chips */}
      {allGenres.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {['All', ...allGenres].map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                selectedGenre === g
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-[#141620] text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5">
          {filteredItems.map((item) => {
            const movieObj: Movie = {
              movieId: item.movie_id,
              title: item.title || `Movie #${item.movie_id}`,
              release_year: item.release_year || null,
              genres: item.genres || [],
              genres_display: item.genres?.join(', ') || 'Unspecified',
              avg_rating: item.avg_rating || 0,
              ratings_count: item.ratings_count || 0,
              is_in_watchlist: true,
            };

            return (
              <div key={item.movie_id} className="relative group">
                <MovieCard
                  movie={movieObj}
                  onSelect={onSelectMovie}
                  onToggleWatchlist={() => handleRemove(item.movie_id)}
                  onRate={onRateMovie}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center rounded-3xl bg-[#141620] border border-white/5 space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Bookmark className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
            Your Watchlist is Empty
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Save interesting titles while browsing the catalogue or exploring recommendations to build your personal queue.
          </p>
          <button
            onClick={() => onNavigate('discover')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
          >
            Start Exploring Movies
          </button>
        </div>
      )}
    </div>
  );
};
