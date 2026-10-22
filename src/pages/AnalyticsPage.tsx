import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Database,
  Film,
  Star,
  Bookmark,
  CheckCircle2,
  TrendingUp,
  Cpu,
  RefreshCw,
  Award,
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
import { AnalyticsData, EvaluationData } from '../types/movie';
import { api } from '../api/client';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [evalData, setEvalData] = useState<EvaluationData | null>(null);
  const [evalK, setEvalK] = useState(10);
  const [loading, setLoading] = useState(true);
  const [evalLoading, setEvalLoading] = useState(false);

  const fetchAnalytics = () => {
    setLoading(true);
    Promise.all([api.getAnalytics(), api.getEvaluation(evalK)])
      .then(([aRes, eRes]) => {
        setAnalytics(aRes);
        setEvalData(eRes);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Analytics error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRunEval = (kVal: number) => {
    setEvalK(kVal);
    setEvalLoading(true);
    api
      .getEvaluation(kVal)
      .then((res) => {
        setEvalData(res);
        setEvalLoading(false);
      })
      .catch((err) => {
        console.error('Eval error:', err);
        setEvalLoading(false);
      });
  };

  return (
    <div className="space-y-12 pb-24 text-zinc-100">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          System & Model Telemetry
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white font-['Space_Grotesk'] tracking-tight">
          Recommendation Analytics Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
          Live statistics from the MovieLens corpus, SQLite persistent user records, and offline evaluation metrics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: 'Catalogue Titles',
            value: analytics?.total_movies_available.toLocaleString() || '9,742',
            sub: 'Validated MovieLens dataset',
            icon: Film,
          },
          {
            title: 'Dataset Ratings',
            value: analytics?.total_dataset_ratings.toLocaleString() || '100,836',
            sub: 'Community user votes',
            icon: Database,
          },
          {
            title: 'Your Ratings',
            value: analytics?.user_ratings_count || 0,
            sub: `Avg: ${analytics?.user_avg_rating.toFixed(1) || '0.0'}★`,
            icon: Star,
          },
          {
            title: 'Watchlist Items',
            value: analytics?.watchlist_size || 0,
            sub: 'Saved in SQLite queue',
            icon: Bookmark,
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#12141D] border border-white/5 flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">{card.title}</span>
                <Icon className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-white font-['Space_Grotesk']">
                  {card.value}
                </span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">{card.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre Distribution in Catalogue */}
        <div className="p-6 rounded-3xl bg-[#12141D] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                Catalogue Genre Distribution
              </h3>
              <p className="text-xs text-zinc-400">Top 10 genres in MovieLens</p>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            {analytics?.dataset_genre_distribution && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dataset_genre_distribution} layout="vertical">
                  <XAxis type="number" stroke="#71717A" fontSize={11} tickLine={false} />
                  <YAxis
                    dataKey="genre"
                    type="category"
                    stroke="#71717A"
                    fontSize={11}
                    tickLine={false}
                    width={80}
                  />
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
                  <Bar dataKey="count" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* User Rating Distribution */}
        <div className="p-6 rounded-3xl bg-[#12141D] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Your Rating Distribution
              </h3>
              <p className="text-xs text-zinc-400">Score spread from 0.5★ to 5.0★</p>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            {analytics?.user_rating_distribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.user_rating_distribution}>
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
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {analytics.user_rating_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.count > 0 ? '#FB7185' : '#27272A'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Offline Recommendation Quality Evaluation Section */}
      <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#181A24] via-[#12141D] to-[#181A24] border border-amber-500/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Evaluation Methodology
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Space_Grotesk'] mt-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Recommendation Quality Metrics (Precision@K & Recall@K)
            </h2>
            <p className="text-xs text-zinc-300 mt-1 max-w-2xl">
              Evaluated using a 70/30 time-aware chronological split on real MovieLens user ratings without data leakage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Top-K cutoff:</span>
            {[5, 10, 20].map((kVal) => (
              <button
                key={kVal}
                onClick={() => handleRunEval(kVal)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  evalK === kVal
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'bg-black/40 hover:bg-white/10 text-zinc-300 border border-white/5'
                }`}
              >
                K={kVal}
              </button>
            ))}
          </div>
        </div>

        {evalData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Precision@{evalK}</span>
              <div className="text-3xl font-black text-amber-400 font-['Space_Grotesk']">
                {(evalData.precision_at_k * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Proportion of top-{evalK} recommendations that the user rated 4.0★ or higher in the test partition.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Recall@{evalK}</span>
              <div className="text-3xl font-black text-amber-400 font-['Space_Grotesk']">
                {(evalData.recall_at_k * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Coverage of the user's high-rated test items retrieved within the top-{evalK} list.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Evaluation Split Details</span>
              <div className="text-sm font-semibold text-zinc-200 pt-1">
                User #{evalData.test_user_id}
              </div>
              <p className="text-[11px] text-zinc-400">
                Train: {evalData.train_ratings_count} ratings • Test: {evalData.test_ratings_count} ratings • Ground Truth Relevant: {evalData.ground_truth_relevant_count}
              </p>
              <div className="text-[10px] text-amber-300 font-mono pt-1">
                Hits in Top-{evalK}: {evalData.hits}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500">
            Running offline evaluation against MovieLens rating benchmarks...
          </div>
        )}
      </section>
    </div>
  );
};
