# CineMatch AI — Intelligent Movie Recommendation Web Application

> **Tagline:** *Your Next Favorite Movie Starts Here.*  
> **Capstone Internship Project** | Full-Stack Recommendation System & Machine Learning Web Application

---

## 1. Project Overview & Problem Statement

Modern streaming platforms contain thousands of movies, leading to severe choice overload. Users spend 15–20 minutes browsing carousels without selecting a title. 

**CineMatch AI** solves this problem by delivering a production-grade, mathematically grounded movie recommendation web application. Built on the authentic **MovieLens dataset** (9,742 movies and 100,836 user ratings), CineMatch AI combines:
1. **Content-Based Filtering** using Term Frequency–Inverse Document Frequency (TF-IDF) vectorization and Cosine Similarity across titles, genre hierarchies, and community tags.
2. **Personalized Multi-Criteria Hybrid Aggregation** combining user favorite anchors, genre affinity, and quality regularization to prevent popularity bias.
3. **Item-Based Collaborative Filtering** leveraging sparse user-item interaction matrices to project ratings based on community taste patterns.
4. **Relational Persistence** via SQLite with foreign keys and composite constraints for guest profiles, 5-star ratings, watchlists, and preferences.
5. **Explainable AI:** Every recommendation features an algorithm-grounded justification explaining why it was matched (shared genre subsets, community tag overlap, or community rating correlations).

---

## 2. Technology Stack

### Frontend
- **Framework:** React 19 (TypeScript, Hooks, Functional Components)
- **Bundler & Dev Server:** Vite 8
- **Styling:** Tailwind CSS v4 (Cinematic Charcoal `#0B0C10`, Warm Amber `#F59E0B`, Cream Text `#F4F4F5`)
- **Icons:** Lucide React
- **Analytics & Visualizations:** Recharts (Rating distributions, genre breakdown)

### Backend & Machine Learning
- **API Framework:** Python 3.11 + Flask + Flask-CORS
- **Data Engineering:** Pandas & NumPy
- **Machine Learning:** Scikit-Learn (`TfidfVectorizer`, `cosine_similarity`) & SciPy (`csr_matrix`)
- **Database:** SQLite 3 (parameterized SQL, foreign key cascades, ON CONFLICT upserts)
- **Testing:** Pytest (24 automated tests covering data loading, database, recommendation engine, and API)

### Dataset
- **MovieLens Latest Small:** Distributed by GroupLens Research at the University of Minnesota (Harper & Konstan, 2015).

---

## 3. Architecture & Data Flow

```
[ User Browser (React 19 SPA) ]
             |
             | HTTP (JSON, /api/*, X-Profile-Id)
             v
[ Express Dev/Prod Server (server.ts :3000) ]
             |
             | Reverse Proxy /api -> :5001
             v
[ Flask REST API (backend/app.py :5001) ]
       /               \
      /                 \
[ SQLite Database ]   [ Recommendation Engine ]
(cinematch.db)        - TF-IDF Vectorizer (Cached matrix)
- user_profiles       - Cosine Similarity Engine
- ratings (0.5-5.0)   - Item-Based CF (Sparse CSR)
- watchlist           - Offline Precision@K & Recall@K
- preferences         - Grounded Explanation Generator
```

---

## 4. Recommendation Engine & Mathematical Formulations

### A. Content-Based TF-IDF & Cosine Similarity
For every film in the catalogue, a multi-field document string is constructed with domain-specific feature weighting:
$$\text{Document}(m) = [\text{Genres} \times 3] + [\text{Community Tags} \times 2] + [\text{Normalized Title} \times 1]$$

- Unigrams and bigrams are extracted using Scikit-Learn's `TfidfVectorizer(stop_words='english', ngram_range=(1, 2))`.
- The TF-IDF matrix $V \in \mathbb{R}^{M \times D}$ is precomputed and cached in memory at server startup.
- Given a target film $i$, the similarity vector with all catalogue entries $j$ is calculated via Cosine Similarity:
$$\text{similarity}(i, j) = \cos(\mathbf{v}_i, \mathbf{v}_j) = \frac{\mathbf{v}_i \cdot \mathbf{v}_j}{\|\mathbf{v}_i\|_2 \|\mathbf{v}_j\|_2}$$

### B. Personalized Multi-Criteria Aggregation
When the user configures favorite anchor movies $\{f_1, f_2, \dots, f_k\}$ and preferred genres:
1. **Content Similarity Component:** Average similarity vector to favorite anchor films:
   $$S_{\text{content}}(m) = \frac{1}{|F|} \sum_{f \in F} \cos(\mathbf{v}_m, \mathbf{v}_f)$$
2. **Genre Affinity Component:** Proportion of user-selected genres covered by film $m$:
   $$S_{\text{genre}}(m) = \frac{|\text{Genres}(m) \cap \text{Preferred}|}{\max(|\text{Preferred}|, 1)}$$
3. **Quality Regularization Component:** Normalized average community rating:
   $$S_{\text{quality}}(m) = \frac{\text{avg\_rating}(m)}{5.0}$$
4. **Composite Score:**
   $$\text{Score}(m) = w_c \cdot S_{\text{content}}(m) + w_g \cdot S_{\text{genre}}(m) + w_q \cdot S_{\text{quality}}(m)$$
   *(Default weights: $w_c = 0.55$, $w_g = 0.30$, $w_q = 0.15$. Configurable via UI sliders).*
5. **Candidate Filtering:** Automatically filters out explicitly disliked movies ($\le 2.0\text{★}$), already rated films, and watchlist items if configured.

### C. Item-Based Collaborative Filtering
Items with $\ge 5$ community ratings form an Item $\times$ User interaction matrix $\mathbf{R} \in \mathbb{R}^{I \times U}$. Cosine similarity $s(i, j)$ between item rating vectors is precomputed. For user $u$ with rated items $R_u$:
$$\hat{r}(u, i) = \frac{\sum_{j \in R_u} s(i, j) \cdot r(u, j)}{\sum_{j \in R_u} |s(i, j)|}$$
- **Cold-Start Handling:** If the user has rated fewer than 2 items in the collaborative matrix, the system falls back to a hybrid popularity and content ranking with an explicit explanation.

---

## 5. Offline Evaluation Methodology

To validate recommendation quality without data leakage, CineMatch AI implements a chronological evaluation module (`evaluate_recommendations`):
- Selects an active user profile from MovieLens ($\ge 20$ ratings).
- Splits interactions **time-awares** into 70% training and 30% held-out test set.
- Relevant items in test set defined as $\text{rating} \ge 4.0\text{★}$.
- Evaluates Top-$K$ recommendations:
$$\text{Precision}@K = \frac{|\text{Recommended}_K \cap \text{Relevant}_{\text{test}}|}{K}$$
$$\text{Recall}@K = \frac{|\text{Recommended}_K \cap \text{Relevant}_{\text{test}}|}{|\text{Relevant}_{\text{test}}|}$$

Live metrics can be inspected on the **Dashboard Analytics** tab.

---

## 6. Project Structure

```
.
├── backend/
│   ├── __init__.py
│   ├── app.py                     # Flask REST API endpoints & error handling
│   ├── data_loader.py             # MovieLens loader, schema validator & preprocessor
│   ├── database.py                # SQLite ORM/manager with relational constraints
│   ├── recommendation_engine.py   # TF-IDF, Cosine Similarity, CF, and Evaluation
│   ├── requirements.txt           # Python dependencies
│   ├── cinematch.db               # SQLite database file
│   └── data/                      # MovieLens dataset files
│       ├── movies.csv             # 9,742 movie records
│       ├── ratings.csv            # 100,836 ratings
│       ├── tags.csv               # 3,683 user tags
│       ├── links.csv              # IMDb & TMDb IDs
│       └── README.txt             # GroupLens attribution
├── src/
│   ├── api/
│   │   └── client.ts              # Typed API client with profile headers
│   ├── components/
│   │   ├── Navbar.tsx             # Navigation tabs & profile switcher
│   │   ├── MovieCard.tsx          # Card with procedural posters & rating controls
│   │   ├── MovieDetailsModal.tsx  # Deep-dive modal with similar titles
│   │   └── RatingStars.tsx        # 5-star interactive rating widget (0.5 steps)
│   ├── pages/
│   │   ├── HomePage.tsx           # Hero spotlight, search, catalogue highlights
│   │   ├── DiscoverPage.tsx       # Full catalogue with filters & pagination
│   │   ├── RecommendationsPage.tsx# Recommendation Lab & weight sliders
│   │   ├── WatchlistPage.tsx      # Persistent user watchlist queue
│   │   ├── ProfilePage.tsx        # User ratings CRUD & distribution chart
│   │   ├── AnalyticsPage.tsx      # KPIs, genre charts & offline evaluation
│   │   └── DocsModal.tsx          # Technical docs and math formulations
│   ├── types/
│   │   └── movie.ts               # Complete TypeScript definitions
│   ├── utils/
│   │   └── poster.ts              # Procedural cinematic poster generator
│   ├── App.tsx                    # Root component & state management
│   ├── index.css                  # Tailwind CSS styling & custom scrollbars
│   └── main.tsx                   # React DOM entry point
├── tests/
│   ├── __init__.py
│   ├── test_api.py                # Integration tests for Flask endpoints
│   ├── test_database.py           # SQLite tests (CRUD, constraints, upserts)
│   └── test_recommendation.py     # TF-IDF ranking, cold-start, and metric tests
├── package.json                   # Node scripts & dependencies
├── pytest.ini                     # Pytest configuration
├── server.ts                      # Full-stack Express server + proxy to Flask
├── tsconfig.json                  # TypeScript compiler configuration
├── vite.config.ts                 # Vite bundler configuration
└── README.md                      # This comprehensive documentation
```

---

## 7. Installation & Local Setup

### Prerequisites
- **Node.js:** v18+ (Node 20 or 22 recommended)
- **Python:** v3.10+
- **pip** and **git**

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/cinematch-ai.git
cd cinematch-ai
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Install Python Dependencies
**Linux / macOS:**
```bash
pip install -r backend/requirements.txt
```
**Windows (PowerShell):**
```powershell
pip install -r backend\requirements.txt
```

### Step 4: Dataset Verification
The MovieLens dataset is included in `backend/data/`. If you need to re-download fresh files:
```bash
curl -s -L -o ml-latest-small.zip https://files.grouplens.org/datasets/movielens/ml-latest-small.zip
unzip ml-latest-small.zip
cp ml-latest-small/*.csv backend/data/
```

---

## 8. Running the Application

### Option A: Full-Stack Mode (Recommended)
This runs the Express dev server on port `3000`, automatically spawns the Python Flask backend on port `5001`, and reverse-proxies `/api/*`:
```bash
npm run dev
```
Open your browser at: **`http://localhost:3000`**

### Option B: Running Backend & Frontend Separately
**Terminal 1 (Backend API):**
```bash
# Linux / macOS
PYTHONPATH=. python3 backend/app.py

# Windows (PowerShell)
$env:PYTHONPATH="."
python backend\app.py
```
*Flask starts on `http://127.0.0.1:5001`.*

**Terminal 2 (Frontend):**
```bash
npm run dev
```

---

## 9. Automated Testing & Verification

Run the full Pytest suite verifying dataset validation, database constraints, recommendation rankings, exclusions, and API contracts:

```bash
# Run all tests
pytest tests/ -v
```

### Actual Execution Results:
```text
============================= test session starts ==============================
platform linux -- Python 3.11.2, pytest-9.1.1, pluggy-1.7.0 -- /usr/bin/python3
rootdir: /app/applet, configfile: pytest.ini
collected 24 items

tests/test_api.py::test_health_endpoint PASSED                           [  4%]
tests/test_api.py::test_movies_listing_and_filtering PASSED              [  8%]
tests/test_api.py::test_movie_details_endpoint PASSED                    [ 12%]
tests/test_api.py::test_content_recommendations_endpoint PASSED          [ 16%]
tests/test_api.py::test_personalized_recommendations_endpoint PASSED     [ 20%]
tests/test_api.py::test_ratings_lifecycle PASSED                         [ 25%]
tests/test_api.py::test_watchlist_lifecycle PASSED                       [ 29%]
tests/test_api.py::test_preferences_lifecycle PASSED                     [ 33%]
tests/test_api.py::test_analytics_and_evaluation PASSED                  [ 37%]
tests/test_database.py::test_init_and_default_profile PASSED             [ 41%]
tests/test_database.py::test_custom_profile_creation PASSED              [ 45%]
tests/test_database.py::test_ratings_create_update_delete PASSED         [ 50%]
tests/test_database.py::test_ratings_invalid_scale PASSED                [ 54%]
tests/test_database.py::test_watchlist_operations PASSED                 [ 58%]
tests/test_database.py::test_preferences_persistence PASSED              [ 62%]
tests/test_database.py::test_profile_analytics PASSED                    [ 66%]
tests/test_recommendation.py::test_dataset_loader_validation PASSED      [ 70%]
tests/test_recommendation.py::test_dataset_validation_missing_file PASSED [ 75%]
tests/test_recommendation.py::test_similar_movies_content_ranking PASSED [ 79%]
tests/test_recommendation.py::test_similar_movies_invalid_id PASSED      [ 83%]
tests/test_recommendation.py::test_personalized_recommendations_with_favorites PASSED [ 87%]
tests/test_recommendation.py::test_personalized_disliked_exclusion PASSED [ 91%]
tests/test_recommendation.py::test_collaborative_filtering_and_cold_start PASSED [ 95%]
tests/test_recommendation.py::test_offline_evaluation_precision_recall PASSED [100%]

============================== 24 passed in 8.06s ==============================
```

Frontend compilation test:
```bash
npm run build
# vite build -> Successfully compiled 63 modules into dist/
```

TypeScript lint check:
```bash
npm run lint
# tsc --noEmit -> 0 errors found
```

---

## 10. REST API Reference

| Endpoint | Method | Parameters / Body | Description |
|---|---|---|---|
| `/api/health` | `GET` | None | Returns system health, dataset schema report, and indexed counts |
| `/api/movies` | `GET` | `query`, `genre`, `min_year`, `max_year`, `sort_by`, `order`, `page`, `limit` | Paginated, filtered, and sorted movie catalogue |
| `/api/movies/<id>` | `GET` | `id` (int) | Movie metadata, user rating, and similar titles |
| `/api/recommendations/<id>` | `GET` | `top_k` (int, default 10) | Content-based recommendations with grounded explanations |
| `/api/recommendations/personalized` | `POST` | `{ favorite_movies, preferred_genres, method, exclude_rated, exclude_watchlist, content_weight, genre_weight, rating_quality_weight, top_k }` | Multi-criteria personalized recommendations |
| `/api/ratings` | `GET` | Header: `X-Profile-Id` | Returns all reviews and ratings for active profile |
| `/api/ratings` | `POST` | `{ movie_id: int, rating: float }` | Persists rating (0.5 to 5.0) |
| `/api/ratings/<id>` | `DELETE` | `id` (int) | Deletes review for specified movie |
| `/api/watchlist` | `GET` | Header: `X-Profile-Id` | Returns saved watchlist items |
| `/api/watchlist` | `POST` | `{ movie_id: int }` | Adds film to watchlist (prevents duplicates) |
| `/api/watchlist/<id>` | `DELETE` | `id` (int) | Removes film from watchlist |
| `/api/preferences` | `GET` | Header: `X-Profile-Id` | Retrieves saved favorite genres & anchor movies |
| `/api/preferences` | `POST` | `{ preferred_genres: string[], favorite_movies: int[] }` | Persists user preferences |
| `/api/analytics` | `GET` | Header: `X-Profile-Id` | System dashboard KPIs and rating score distributions |
| `/api/evaluation` | `GET` | `k` (int, default 10) | Offline Precision@K & Recall@K evaluation metrics |
| `/api/profiles` | `GET` / `POST` | `{ profile_id, display_name }` | List or register guest profiles |

---

## 11. Production Deployment Guide

### Option 1: Containerized (Docker / Cloud Run)
Create a `Dockerfile`:
```dockerfile
FROM python:3.11-slim-bookworm

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV FLASK_PORT=5001

EXPOSE 3000
CMD ["npm", "start"]
```

### Option 2: Cloud Run / Render
- Set build command: `npm install && pip install -r backend/requirements.txt && npm run build`
- Set start command: `npm start`
- Note on SQLite Persistence: Cloud Run containers use ephemeral storage. For long-term multi-instance storage in production environments, mount a persistent volume (e.g. Cloud Storage FUSE) or transition `backend/database.py` connection to PostgreSQL / Cloud SQL.

---

## 12. Known Limitations & Future Improvements

1. **Dataset Recency:** MovieLens Latest Small covers films up to 2018. Integrating an automated TMDb API pipeline would allow pulling current cinema releases.
2. **Deep Learning Embeddings:** While TF-IDF is fast, interpretable, and computationally lightweight, sentence-transformer embeddings (e.g., MiniLM) could capture more nuanced plot synopses.
3. **Session Synchronisation:** Currently, guest profiles persist in SQLite and are keyed via local storage header `X-Profile-Id`. Adding email/password authentication or OAuth would enable multi-device sync.

---

## 13. Author & License

- **Developer:** [Your Name / Candidate Name]
- **Email:** [Your Email / Contact]
- **GitHub:** [https://github.com/your-username/cinematch-ai](https://github.com/your-username/cinematch-ai)
- **License:** MIT License (MovieLens dataset under GroupLens research terms)
