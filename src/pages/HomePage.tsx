import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Compass,
  ArrowRight,
  Search,
  Star,
  Film,
  Database,
  Cpu,
  TrendingUp,
} from 'lucide-react';
import { Movie, RecommendationItem } from '../types/movie';
import { MovieCard } from '../components/MovieCard';
import { api } from '../api/client';
import { NavigationTab } from '../components/Navbar';

interface HomePageProps {
  onNavigate: (tab: NavigationTab, searchParam?: string, genreParam?: string) => void;
  onSelectMovie: (movie: Movie) => void;
  onToggleWatchlist: (movie: Movie) => void;
  onRateMovie: (movie: Movie, rating: number) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectMovie,
  onToggleWatchlist,
  onRateMovie,
}) => {
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [recommendedPreview, setRecommendedPreview] = useState<RecommendationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getMovies({ sort_by: 'ratings_count', limit: 8 }),
      api.getGenres(),
      api.getPersonalizedRecommendations({ top_k: 4 }),
    ])
      .then(([moviesRes, genresRes, recsRes]) => {
        if (!isMounted) return;
        setFeaturedMovies(moviesRes.movies);
        setGenres(genresRes.genres.slice(0, 8));
        setRecommendedPreview(recsRes.recommendations);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Home data load error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('discover', searchQuery.trim());
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#161822] via-[#10121A] to-[#0B0C10] border border-white/10 p-6 sm:p-12 lg:p-16">
        {/* Ambient lighting glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Next-Gen Content & Collaborative Discovery
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white font-['Space_Grotesk'] tracking-tight leading-[1.1]">
            Your Next Favorite Movie <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
              Starts Right Here.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed max-w-2xl mx-auto">
            Discover films tailored to your cinematic DNA. Powered by TF-IDF metadata vectorization, cosine similarity, and real MovieLens rating patterns.
          </p>

          {/* Search Bar in Hero */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto relative flex items-center">
            <Search className="w-5 h-5 absolute left-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, director theme, or genre (e.g. Inception, Sci-Fi)..."
              className="w-full pl-12 pr-28 py-4 bg-black/60 border border-white/15 focus:border-amber-400 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 backdrop-blur-md shadow-2xl transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Hero CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('recommendations')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Personalized Recommendation Lab</span>
            </button>
            <button
              onClick={() => onNavigate('discover')}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm flex items-center gap-2 border border-white/10 transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Browse Full Catalogue</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tech & Data Engine Banner */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'MovieLens Records', value: '9,742 Movies', icon: Film, sub: 'Authentic ML dataset' },
          { label: 'Community Ratings', value: '100,836 Votes', icon: Database, sub: 'Cleaned & validated' },
          { label: 'Content Engine', value: 'TF-IDF + Cosine', icon: Cpu, sub: 'Multi-field vectorization' },
          { label: 'Collaborative Filter', value: 'Item-Based', icon: TrendingUp, sub: 'Community preference patterns' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#12141D] border border-white/5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
                <Icon className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-white font-['Space_Grotesk']">
                {stat.value}
              </span>
              <span className="text-[11px] text-zinc-500">{stat.sub}</span>
            </div>
          );
        })}
      </section>

      {/* Popular Genres Quick Filter */}
      {genres.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-['Space_Grotesk']">
                Explore by Genre
              </h2>
              <p className="text-xs text-zinc-400">Directly jump into top cinematic genres</p>
            </div>
            <button
              onClick={() => onNavigate('discover')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>All genres</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => onNavigate('discover', undefined, g)}
                className="px-4 py-2 rounded-xl bg-[#141620] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-xs font-semibold text-zinc-300 hover:text-amber-300 transition-all flex items-center gap-2"
              >
                <span>{g}</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Featured Catalogue Highlights */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-['Space_Grotesk'] flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              Most Celebrated Classics
            </h2>
            <p className="text-xs text-zinc-400">
              Highest vote-count films with rich community tags and critical acclaim.
            </p>
          </div>
          <button
            onClick={() => onNavigate('discover')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredMovies.map((movie) => (
              <MovieCard
                key={movie.movieId}
                movie={movie}
                onSelect={onSelectMovie}
                onToggleWatchlist={onToggleWatchlist}
                onRate={onRateMovie}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recommendations Preview Teaser */}
      {recommendedPreview.length > 0 && (
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/30 via-[#141620] to-rose-950/30 border border-amber-500/20 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Algorithm Spotlight
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Space_Grotesk'] mt-2">
                Personalized Recommendation Preview
              </h2>
              <p className="text-xs text-zinc-300">
                Generated from multi-criteria content matching and current user profile preferences.
              </p>
            </div>
            <button
              onClick={() => onNavigate('recommendations')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
            >
              <span>Open Recommendation Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedPreview.map((rec) => (
              <MovieCard
                key={rec.movieId}
                movie={rec}
                onSelect={onSelectMovie}
                onToggleWatchlist={onToggleWatchlist}
                onRate={onRateMovie}
                scoreBadge={`${Math.round((rec.recommendation_score || rec.similarity_score || 0.8) * 100)}% Match`}
                explanation={rec.explanation}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
