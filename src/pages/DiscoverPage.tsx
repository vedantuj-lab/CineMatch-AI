import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  RefreshCw,
  Film,
} from 'lucide-react';
import { Movie } from '../types/movie';
import { MovieCard } from '../components/MovieCard';
import { api } from '../api/client';

interface DiscoverPageProps {
  initialSearch?: string;
  initialGenre?: string;
  onSelectMovie: (movie: Movie) => void;
  onToggleWatchlist: (movie: Movie) => void;
  onRateMovie: (movie: Movie, rating: number) => void;
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({
  initialSearch = '',
  initialGenre = 'All',
  onSelectMovie,
  onToggleWatchlist,
  onRateMovie,
}) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(24);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [sortBy, setSortBy] = useState('ratings_count');
  const [order, setOrder] = useState('desc');
  const [minYear, setMinYear] = useState<number | ''>('');
  const [maxYear, setMaxYear] = useState<number | ''>('');

  const [genres, setGenres] = useState<string[]>([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Load genres
  useEffect(() => {
    api.getGenres().then((res) => {
      setGenres(['All', ...res.genres]);
    });
  }, []);

  // Fetch movies when params change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getMovies({
        query: search.trim() || undefined,
        genre: selectedGenre !== 'All' ? selectedGenre : undefined,
        min_year: minYear !== '' ? Number(minYear) : undefined,
        max_year: maxYear !== '' ? Number(maxYear) : undefined,
        sort_by: sortBy,
        order: order,
        page: page,
        limit: limit,
      })
      .then((res) => {
        if (!isMounted) return;
        setMovies(res.movies);
        setTotal(res.total);
        setTotalPages(res.total_pages);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Discover movies fetch failed:', err);
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, selectedGenre, sortBy, order, minYear, maxYear, page, limit]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedGenre('All');
    setSortBy('ratings_count');
    setOrder('desc');
    setMinYear('');
    setMaxYear('');
    setPage(1);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            Movie Discovery Catalogue
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Browse {total.toLocaleString()} authentic MovieLens films with multi-field search and filters.
          </p>
        </div>

        <button
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            showFiltersPanel
              ? 'bg-amber-500 text-zinc-950 font-bold'
              : 'bg-[#141620] hover:bg-white/10 text-zinc-300 border border-white/10'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Advanced Filters</span>
          {(minYear !== '' || maxYear !== '' || selectedGenre !== 'All') && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>
      </div>

      {/* Search and Sort Control Bar */}
      <div className="p-4 rounded-2xl bg-[#12141D] border border-white/5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search movie titles, genres, keywords..."
            className="w-full pl-10 pr-9 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 whitespace-nowrap">Sort by:</span>
          <select
            value={`${sortBy}-${order}`}
            onChange={(e) => {
              const [sb, ord] = e.target.value.split('-');
              setSortBy(sb);
              setOrder(ord);
              setPage(1);
            }}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
          >
            <option value="ratings_count-desc">Popularity (Most Ratings)</option>
            <option value="avg_rating-desc">Highest Rated (Avg Stars)</option>
            <option value="release_year-desc">Newest Release Year</option>
            <option value="release_year-asc">Oldest Release Year</option>
            <option value="title-asc">Title (A to Z)</option>
            <option value="title-desc">Title (Z to A)</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Drawer */}
      {showFiltersPanel && (
        <div className="p-5 rounded-2xl bg-[#141620] border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter Parameters
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Year Range */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Release Year Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="e.g. 1970"
                  value={minYear}
                  onChange={(e) => {
                    setMinYear(e.target.value ? Number(e.target.value) : '');
                    setPage(1);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                />
                <span className="text-zinc-500 text-xs">to</span>
                <input
                  type="number"
                  placeholder="e.g. 2018"
                  value={maxYear}
                  onChange={(e) => {
                    setMaxYear(e.target.value ? Number(e.target.value) : '');
                    setPage(1);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Genre Pills Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {genres.map((g) => {
          const isSelected = selectedGenre === g;
          return (
            <button
              key={g}
              onClick={() => {
                setSelectedGenre(g);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'bg-[#141620] hover:bg-white/10 text-zinc-300 border border-white/5'
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      {/* Movie Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 animate-pulse">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl" />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5">
          {movies.map((movie) => (
            <MovieCard
              key={movie.movieId}
              movie={movie}
              onSelect={onSelectMovie}
              onToggleWatchlist={onToggleWatchlist}
              onRate={onRateMovie}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-[#141620] border border-white/5 space-y-4">
          <Film className="w-12 h-12 mx-auto text-zinc-600" />
          <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
            No matching movies found
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Try adjusting your search query, genre selection, or release year filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#12141D] border border-white/5">
          <div className="text-xs text-zinc-400">
            Page <span className="text-white font-bold">{page}</span> of{' '}
            <span className="text-white font-bold">{totalPages}</span> ({total.toLocaleString()} total films)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-zinc-200 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono px-3 py-1 bg-black/40 rounded-lg text-amber-300 border border-white/5">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-zinc-200 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
