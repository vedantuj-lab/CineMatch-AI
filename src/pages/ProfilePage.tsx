import React, { useState, useEffect } from 'react';
import {
  User,
  Star,
  Trash2,
  Bookmark,
  Sparkles,
  TrendingUp,
  Sliders,
  Calendar,
  Film,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { UserRating, UserPreferences, Movie } from '../types/movie';
import { api, getActiveProfileId } from '../api/client';
import { RatingStars } from '../components/RatingStars';

interface ProfilePageProps {
  onSelectMovie: (movie: Movie) => void;
  onRatingUpdated: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onSelectMovie,
  onRatingUpdated,
}) => {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const activeProfile = getActiveProfileId();

  const fetchProfileData = () => {
    setLoading(true);
    Promise.all([api.getRatings(), api.getPreferences()])
      .then(([ratingsRes, prefRes]) => {
        setRatings(ratingsRes.ratings);
        setPreferences(prefRes.preferences);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Profile fetch error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfileData();
  }, [activeProfile]);

  const handleUpdateRating = (movieId: number, newRating: number) => {
    if (newRating === 0) {
      handleDeleteRating(movieId);
      return;
    }
    api.saveRating(movieId, newRating).then(() => {
      setRatings((prev) =>
        prev.map((r) => (r.movie_id === movieId ? { ...r, rating: newRating } : r))
      );
      onRatingUpdated();
    });
  };

  const handleDeleteRating = (movieId: number) => {
    api.deleteRating(movieId).then(() => {
      setRatings((prev) => prev.filter((r) => r.movie_id !== movieId));
      onRatingUpdated();
    });
  };

  // Derive rating distribution
  const distributionData = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((star) => {
    const count = ratings.filter((r) => r.rating === star).length;
    return { rating: `${star}★`, count };
  });

  // Calculate top genres from ratings >= 3.5
  const genreCounts: Record<string, number> = {};
  ratings
    .filter((r) => r.rating >= 3.5)
    .forEach((r) => {
      r.genres?.forEach((g) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });

  const topRatedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const avgUserScore =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2)
      : '0.00';

  return (
    <div className="space-y-12 pb-24 text-zinc-100">
      {/* Profile Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#181A24] via-[#12141D] to-[#181A24] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/20 text-zinc-950">
            <User className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-['Space_Grotesk'] capitalize">
                {activeProfile.replace('_', ' ')}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                SQLite Profile
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Personal ratings, watchlist, and preference matrices stored persistently.
            </p>
          </div>
        </div>

        {/* Quick Profile Summary Stats */}
        <div className="flex items-center gap-6 bg-black/40 px-5 py-3 rounded-2xl border border-white/5">
          <div className="text-center">
            <span className="text-xs text-zinc-400 block font-medium">Rated</span>
            <span className="text-xl font-black text-white font-['Space_Grotesk']">
              {ratings.length}
            </span>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="text-center">
            <span className="text-xs text-zinc-400 block font-medium">Avg Score</span>
            <span className="text-xl font-black text-amber-400 font-['Space_Grotesk']">
              {avgUserScore}★
            </span>
          </div>
        </div>
      </div>

      {/* Analytics & Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rating Distribution Chart */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[#12141D] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Rating Score Distribution
            </h3>
            <span className="text-xs text-zinc-400">Total {ratings.length} votes</span>
          </div>

          <div className="h-56 w-full pt-4">
            {ratings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData}>
                  <XAxis dataKey="rating" stroke="#71717A" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#181A24',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      color: '#F4F4F5',
                      fontSize: '12px',
                    }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.count > 0 ? '#F59E0B' : '#27272A'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                Rate some movies to generate your rating distribution chart.
              </div>
            )}
          </div>
        </div>

        {/* Favorite Genres Affinities */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-[#12141D] border border-white/5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Deduced Taste Profile
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Top genres based on your 3.5★+ ratings.
            </p>

            {topRatedGenres.length > 0 ? (
              <div className="space-y-2.5">
                {topRatedGenres.map(([genre, count], idx) => (
                  <div key={genre} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200">
                      {idx + 1}. {genre}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                      {count} high {count === 1 ? 'rating' : 'ratings'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic py-4">
                Rate movies 3.5★ or higher to automatically uncover your cinematic genre affinities.
              </p>
            )}
          </div>

          {/* Configured Preferences */}
          {preferences && preferences.preferred_genres.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <span className="text-[11px] font-bold uppercase text-zinc-400 block mb-2">
                Manually Configured Genres:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {preferences.preferred_genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 text-[11px] border border-white/5"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rated Movies List (Editable CRUD) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
              Your Reviewed Movies ({ratings.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Click any star to update your score, or use the trash icon to remove your rating.
            </p>
          </div>
        </div>

        {ratings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ratings.map((r) => (
              <div
                key={r.movie_id}
                className="p-4 rounded-2xl bg-[#12141D] border border-white/5 hover:border-amber-500/20 flex items-center justify-between gap-4 transition-colors"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  onClick={() =>
                    onSelectMovie({
                      movieId: r.movie_id,
                      title: r.title || `Movie #${r.movie_id}`,
                      release_year: r.release_year || null,
                      genres: r.genres || [],
                      genres_display: r.genres?.join(', ') || '',
                      avg_rating: r.avg_rating || 0,
                      ratings_count: 0,
                      user_rating: r.rating,
                    })
                  }
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                    <Film className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate hover:text-amber-400 transition-colors">
                      {r.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      {r.release_year ? `${r.release_year} • ` : ''}
                      {r.genres?.slice(0, 2).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <RatingStars
                    value={r.rating}
                    size="sm"
                    onChange={(newRating) => handleUpdateRating(r.movie_id, newRating)}
                  />
                  <button
                    onClick={() => handleDeleteRating(r.movie_id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Delete rating"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-[#141620] border border-white/5 space-y-3">
            <Star className="w-10 h-10 mx-auto text-zinc-600" />
            <h4 className="text-base font-bold text-white font-['Space_Grotesk']">
              No ratings recorded yet
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Rate movies across the catalogue to personalize your recommendations and view analytics.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
