# Clyricify: Project Overview

Clyricify is a web application for music lovers who want deep insights into song lyrics, particularly for Chinese-language music. It solves the problem of "raw" lyrics by providing a cleaned, translated, and pinyin-annotated experience via a multi-source orchestration system, with accounts and playlists for saving songs.

## Core Objectives
- **Accessibility**: Provide English translations and pinyin for Chinese lyrics to help non-native speakers understand and sing along.
- **Reliability**: Use a tiered fallback system to ensure lyrics are fetched even when primary AI services or specific music APIs fail.
- **Speed**: Interleave multiple search sources in parallel to provide the best possible variety of results instantly.

---

## Key Features

### 1. Multi-Source Search Orchestration
Instead of relying on one provider, Clyricify searches four distinct sources simultaneously:
- **LRCLIB**: An open-source, community-driven lyrics database.
- **NetEase Cloud Music**: One of the largest Chinese music platforms.
- **KuGou Music**: Integrated via the `@meting/core` framework for extensive library coverage.
- **Database**: Previously processed songs cached in the app's own database.
*Results are interleaved (round-robin style) so the user gets variety in every search.*

### 2. The 3-Tier AI Fallback Cascade
To provide clean lyrics (no timestamps, ads, or junk) and accurate metadata (Lyricist, Composer, etc.), the app follows a priority chain:
- **Tier 1**: Primary Gemini 2.5 Flash API key.
- **Tier 2**: Secondary Gemini 2.5 Flash Lite API key (activated if the primary hits rate limits or 503 errors).
- **Tier 3 (The Safety Net)**: A code-based regex extractor. If all AI services fail, Clyricify uses deterministic heuristics to strip junk and identify credits via code, ensuring the app never breaks.

### 3. Lyric Enrichment
For every Chinese line detected:
- **Pinyin**: Generated using `pinyin-pro` with tone markers.
- **Translation**: Translated into clear English via Google Translate.
- **Simplified/Traditional Toggle**: Characters converted on the fly with `opencc-js`.
- **Stacked View**: Displayed in a vertical "stack" (Chinese -> Pinyin -> English) for easy reading.

### 4. Accounts & Playlists
- Username/password accounts with scrypt-hashed passwords and cookie-based sessions (30 days).
- Users can create playlists and save songs to them; playlist songs are cached in the database for instant reloads.

### 5. Background Refresh
Cached songs are re-processed in the background through a serverless-safe update queue: the response is served instantly from cache while the refresh runs under `waitUntil`, and the client polls a lightweight version endpoint to pick up the improved lyrics when they land.

---

## Technical Specifications

### Tech Stack
- **Frontend**: Nuxt 4 (framework), Vue 3 (components), Tailwind CSS 4 (styling).
- **Backend**: Nuxt Server Engine (Nitro/H3), Node.js, deployed on Vercel.
- **Database**: Drizzle ORM — better-sqlite3 locally, Turso (libSQL) in production.
- **AI/ML**: Google Gemini 2.5 Flash & 2.5 Flash Lite (for cleaning/metadata).
- **Data Fetching**: Meting-core (Music API wrapper), NeteaseCloudMusicApi, Fetch API.
- **Linguistic Processing**: `pinyin-pro` for Romanization, Google Translate for English translations, `opencc-js` for Simplified/Traditional conversion.

### Data Architecture
- **Song Cache**: Processed songs (raw LRC, cleaned lyrics JSON, credits metadata) are stored in the `songs` table so repeat visits skip the AI pipeline.
- **User Data**: `users`, `sessions`, `playlists`, and `playlist_songs` tables, shared between local SQLite and production Turso via a common Drizzle schema.
- **Scripts**: `migrate_data.ts` syncs the local database to Turso; `scripts/purge-sessions.mjs` invalidates all active sessions (incident response).

---

## The "Ins and Outs": How it works
1. **Search Phase**: The user types a query. The backend fires 4 parallel requests. They are merged into a single list where labels (**LRCLIB**, **NETEASE**, **KUGOU**, **DATABASE**) are applied.
2. **Fetch Phase**: When a song is clicked, the backend returns the cached copy if one exists; otherwise it hits the specific source's ID.
3. **Processing Phase**:
    - The raw LRC string is stripped of timestamps.
    - The "Cleaned" text is sent through the **Fallback Cascade** to get pure lyrics and structured metadata.
    - The cleaned text is scanned for Chinese characters; if found, Pinyin and Translations are computed.
4. **Render Phase**: The frontend receives a `LyricLine[]` array and maps them into the reactive UI, handling the stacking and formatting.

---

> [!IMPORTANT]
> **Environment Configuration**
> AI cleaning requires `GEMINI_API_KEY` and `GEMINI_API_FALLBACK`. In production, `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` point the app at Turso; without them it falls back to a local SQLite database in `database/` (never commit it — it contains user data).
