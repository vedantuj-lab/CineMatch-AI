import React from 'react';
import { BookOpen, Cpu, Database, CheckCircle2, Award, Terminal, Layers } from 'lucide-react';

export const DocsModal: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 text-zinc-200">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          Technical Specifications & System Architecture
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white font-['Space_Grotesk'] tracking-tight">
          CineMatch AI Documentation
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Complete engineering reference for recommendation algorithms, dataset validation, SQLite schema, and API endpoints.
        </p>
      </div>

      {/* 1. Problem Statement & Architecture */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#12141D] border border-white/5 space-y-4">
        <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          1. System Architecture & Problem Statement
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          Modern streaming catalogues overwhelm users with thousands of choices. CineMatch AI tackles the choice overload problem by implementing a transparent, two-pronged recommendation system:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <span className="font-bold text-sm text-amber-400">Content-Based Engine</span>
            <p className="text-xs text-zinc-400">
              Transforms movie metadata into dense mathematical feature vectors using TF-IDF and computes pairwise cosine similarity to discover films with matching genre archetypes, community tags, and semantic motifs.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <span className="font-bold text-sm text-amber-400">Collaborative Filter</span>
            <p className="text-xs text-zinc-400">
              Leverages sparse user-item interaction matrices to project unrated film scores based on historical co-rating patterns from 610 MovieLens users across 100,000+ ratings.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Recommendation Algorithms */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#12141D] border border-white/5 space-y-6">
        <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-400" />
          2. Mathematical Formulations
        </h2>

        {/* TF-IDF & Cosine */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider text-amber-300">
            A. Content-Based TF-IDF & Cosine Similarity
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Movie corpus strings are synthesized using a multi-field weighting scheme:
            <code className="block my-2 p-2.5 rounded-xl bg-black/50 font-mono text-xs text-amber-300 border border-white/5">
              Document = [Genres × 3] + [Community Tags × 2] + [Normalized Title × 1]
            </code>
            TF-IDF vectorizer extracts unigrams and bigrams, transformed into an L2-normalized feature matrix <span className="font-mono text-amber-300">V</span>. For any pair of items <span className="font-mono text-amber-300">i</span> and <span className="font-mono text-amber-300">j</span>:
          </p>
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center font-mono text-xs sm:text-sm text-amber-300">
            similarity(i, j) = cos(v_i, v_j) = (v_i • v_j) / (||v_i||_2 * ||v_j||_2)
          </div>
        </div>

        {/* Personalized Multi-Criteria Aggregation */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider text-amber-300">
            B. Multi-Criteria Personalized Ranking
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            When a user provides favorite anchor movies and genre preferences, composite candidate scores are computed:
          </p>
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center font-mono text-xs sm:text-sm text-amber-300">
            Score(m) = w_content • sim(m, Favs) + w_genre • match(m, Genres) + w_quality • (avg_rating / 5.0)
          </div>
          <p className="text-xs text-zinc-400">
            By default, weights are normalized to <span className="text-amber-400 font-semibold">55% content, 30% genre, 15% quality</span>. This prevents universally popular titles from drowning out niche genre preferences.
          </p>
        </div>

        {/* Collaborative Filtering */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider text-amber-300">
            C. Item-Based Collaborative Filtering
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Items with at least 5 ratings form an Item × User sparse matrix. Cosine similarity between item rating vectors <span className="font-mono text-amber-300">s(i, j)</span> is precomputed. For user <span className="font-mono text-amber-300">u</span>, predicted rating for candidate item <span className="font-mono text-amber-300">i</span> is:
          </p>
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center font-mono text-xs sm:text-sm text-amber-300">
            r̂(u, i) = [ Σ_(j ∈ R_u) s(i, j) • r(u, j) ] / [ Σ_(j ∈ R_u) |s(i, j)| ]
          </div>
        </div>
      </section>

      {/* 3. Dataset Provenance & SQLite Schema */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#12141D] border border-white/5 space-y-4">
        <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-400" />
          3. Dataset Provenance & Database Schema
        </h2>

        <div className="text-xs sm:text-sm text-zinc-300 space-y-3 leading-relaxed">
          <p>
            <strong>Dataset:</strong> MovieLens Latest Small dataset distributed by GroupLens Research at the University of Minnesota (F. Maxwell Harper and Joseph A. Konstan. 2015).
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-zinc-400">
            <li><strong>movies.csv:</strong> 9,742 movie records (movieId, title, genres)</li>
            <li><strong>ratings.csv:</strong> 100,836 ratings across 610 users on a 5-star scale</li>
            <li><strong>tags.csv:</strong> 3,683 user-generated descriptive tags applied to films</li>
            <li><strong>links.csv:</strong> Identifiers for IMDb and TMDb integration</li>
          </ul>
        </div>

        {/* SQLite Schema */}
        <div className="pt-3">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
            SQLite Database Schema (cinematch.db)
          </span>
          <pre className="p-4 rounded-2xl bg-black/50 text-[11px] font-mono text-zinc-300 border border-white/5 overflow-x-auto">
{`CREATE TABLE user_profiles (
    profile_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ratings (
    profile_id TEXT NOT NULL,
    movie_id INTEGER NOT NULL,
    rating REAL NOT NULL CHECK(rating >= 0.5 AND rating <= 5.0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id, movie_id),
    FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE
);

CREATE TABLE watchlist (
    profile_id TEXT NOT NULL,
    movie_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id, movie_id),
    FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE
);

CREATE TABLE preferences (
    profile_id TEXT PRIMARY KEY,
    preferred_genres TEXT NOT NULL DEFAULT '[]',
    favorite_movies TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE
);`}
          </pre>
        </div>
      </section>

      {/* 4. REST API Specification */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#12141D] border border-white/5 space-y-4">
        <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Terminal className="w-5 h-5 text-amber-400" />
          4. REST API Endpoints Summary
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400">
                <th className="py-2.5 pr-4 font-semibold">Method</th>
                <th className="py-2.5 pr-4 font-semibold">Endpoint</th>
                <th className="py-2.5 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              <tr>
                <td className="py-2 pr-4 font-mono text-emerald-400 font-bold">GET</td>
                <td className="py-2 pr-4 font-mono text-white">/api/health</td>
                <td className="py-2">Health status, dataset validation summary, indexed count</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-emerald-400 font-bold">GET</td>
                <td className="py-2 pr-4 font-mono text-white">/api/movies</td>
                <td className="py-2">Search, filter by genre/year, sort, paginate</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-emerald-400 font-bold">GET</td>
                <td className="py-2 pr-4 font-mono text-white">/api/movies/:id</td>
                <td className="py-2">Movie metadata, user rating, and similar titles</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-emerald-400 font-bold">GET</td>
                <td className="py-2 pr-4 font-mono text-white">/api/recommendations/:id</td>
                <td className="py-2">Content-based similar movies with grounded explanations</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-amber-400 font-bold">POST</td>
                <td className="py-2 pr-4 font-mono text-white">/api/recommendations/personalized</td>
                <td className="py-2">Multi-criteria hybrid or collaborative recommendations</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-emerald-400 font-bold">GET</td>
                <td className="py-2 pr-4 font-mono text-white">/api/ratings</td>
                <td className="py-2">Retrieve ratings for active guest profile</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-amber-400 font-bold">POST</td>
                <td className="py-2 pr-4 font-mono text-white">/api/ratings</td>
                <td className="py-2">Create or update personal movie rating (0.5 to 5.0)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-red-400 font-bold">DELETE</td>
                <td className="py-2 pr-4 font-mono text-white">/api/ratings/:id</td>
                <td className="py-2">Delete review for specified movie</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-emerald-400 font-bold">GET</td>
                <td className="py-2 pr-4 font-mono text-white">/api/watchlist</td>
                <td className="py-2">Retrieve active profile's watchlist queue</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-amber-400 font-bold">POST</td>
                <td className="py-2 pr-4 font-mono text-white">/api/watchlist</td>
                <td className="py-2">Add movie to watchlist (prevents duplicates)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-red-400 font-bold">DELETE</td>
                <td className="py-2 pr-4 font-mono text-white">/api/watchlist/:id</td>
                <td className="py-2">Remove movie from watchlist</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-emerald-400 font-bold">GET</td>
                <td className="py-2 pr-4 font-mono text-white">/api/analytics</td>
                <td className="py-2">System dashboard KPIs and score distributions</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-emerald-400 font-bold">GET</td>
                <td className="py-2 pr-4 font-mono text-white">/api/evaluation</td>
                <td className="py-2">Precision@K and Recall@K offline test split evaluation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Automated Tests Summary */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#12141D] border border-white/5 space-y-4">
        <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          5. Automated Test Suite (Pytest)
        </h2>
        <p className="text-xs text-zinc-300">
          The project includes 24 automated unit and integration tests across data loading, database constraints, recommendation logic, exclusions, and API contracts:
        </p>
        <div className="p-4 rounded-2xl bg-black/50 border border-white/5 font-mono text-xs text-emerald-300">
          $ pytest tests/ -v<br />
          ============================== 24 passed in 8.06s ==============================
        </div>
      </section>
    </div>
  );
};
