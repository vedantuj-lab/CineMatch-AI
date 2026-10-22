import React, { useState, useEffect } from 'react';
import { Navbar, NavigationTab } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DocsModal } from './pages/DocsModal';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { AuthModal } from './components/AuthModal';
import { Movie } from './types/movie';
import { api, getActiveProfileId } from './api/client';
import { Film, Heart, Shield, Terminal } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [discoverSearch, setDiscoverSearch] = useState('');
  const [discoverGenre, setDiscoverGenre] = useState('All');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [watchlistCount, setWatchlistCount] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);

  const refreshCounts = () => {
    api.getWatchlist().then((res) => setWatchlistCount(res.watchlist.length)).catch(() => {});
    api.getRatings().then((res) => setRatingsCount(res.ratings.length)).catch(() => {});
  };

  useEffect(() => {
    refreshCounts();
  }, []);

  const handleProfileChange = () => {
    refreshCounts();
  };

  const handleNavigate = (tab: NavigationTab, searchParam?: string, genreParam?: string) => {
    if (searchParam !== undefined) setDiscoverSearch(searchParam);
    if (genreParam !== undefined) setDiscoverGenre(genreParam);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleWatchlist = (movie: Movie) => {
    const isCurrentlyIn = movie.is_in_watchlist;
    if (isCurrentlyIn) {
      api.removeFromWatchlist(movie.movieId).then(() => {
        refreshCounts();
        if (selectedMovie && selectedMovie.movieId === movie.movieId) {
          setSelectedMovie((prev) => (prev ? { ...prev, is_in_watchlist: false } : null));
        }
      });
    } else {
      api.addToWatchlist(movie.movieId).then(() => {
        refreshCounts();
        if (selectedMovie && selectedMovie.movieId === movie.movieId) {
          setSelectedMovie((prev) => (prev ? { ...prev, is_in_watchlist: true } : null));
        }
      });
    }
  };

  const handleRateMovie = (movie: Movie, rating: number) => {
    if (rating === 0) {
      api.deleteRating(movie.movieId).then(() => {
        refreshCounts();
        if (selectedMovie && selectedMovie.movieId === movie.movieId) {
          setSelectedMovie((prev) => (prev ? { ...prev, user_rating: null } : null));
        }
      });
    } else {
      api.saveRating(movie.movieId, rating).then(() => {
        refreshCounts();
        if (selectedMovie && selectedMovie.movieId === movie.movieId) {
          setSelectedMovie((prev) => (prev ? { ...prev, user_rating: rating } : null));
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-zinc-100 font-['Plus_Jakarta_Sans'] flex flex-col selection:bg-amber-500 selection:text-zinc-950">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        watchlistCount={watchlistCount}
        ratingsCount={ratingsCount}
        onProfileChange={handleProfileChange}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-8">
        {activeTab === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onSelectMovie={setSelectedMovie}
            onToggleWatchlist={handleToggleWatchlist}
            onRateMovie={handleRateMovie}
          />
        )}

        {activeTab === 'discover' && (
          <DiscoverPage
            initialSearch={discoverSearch}
            initialGenre={discoverGenre}
            onSelectMovie={setSelectedMovie}
            onToggleWatchlist={handleToggleWatchlist}
            onRateMovie={handleRateMovie}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsPage
            onSelectMovie={setSelectedMovie}
            onToggleWatchlist={handleToggleWatchlist}
            onRateMovie={handleRateMovie}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistPage
            onSelectMovie={setSelectedMovie}
            onNavigate={(t) => handleNavigate(t)}
            onRateMovie={handleRateMovie}
            onWatchlistChanged={refreshCounts}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage
            onSelectMovie={setSelectedMovie}
            onRatingUpdated={refreshCounts}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsPage />}

        {activeTab === 'docs' && <DocsModal />}
      </main>

      {/* Global Movie Details Modal */}
      <MovieDetailsModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onRateMovie={handleRateMovie}
        onToggleWatchlist={handleToggleWatchlist}
        onSelectMovie={setSelectedMovie}
      />

      {/* Uncomplicated Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          refreshCounts();
        }}
      />

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-[#090A0E] py-12 text-zinc-400 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 font-black">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm font-['Space_Grotesk']">
                CineMatch AI
              </span>
              <p className="text-[11px] text-zinc-400">
                Your Next Favorite Movie Starts Here. Full-Stack Recommendation System.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-400">
            <span>MovieLens Corpus</span>
            <span>•</span>
            <span>TF-IDF Vectorization</span>
            <span>•</span>
            <span>Cosine Similarity</span>
            <span>•</span>
            <span>Collaborative Filtering</span>
            <span>•</span>
            <span>SQLite Persistence</span>
          </div>

          <div className="text-[11px] text-zinc-400">
            Internship Capstone Project • GroupLens Academic License
          </div>
        </div>
      </footer>
    </div>
  );
}
