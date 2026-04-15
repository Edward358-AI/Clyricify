# Clyricify: Project Overview

Clyricify is a high-performance web application designed for music lovers who want deep insights into song lyrics, particularly for Chinese-language music. It solves the problem of "raw" lyrics by providing a cleaned, translated, and pinyin-annotated experience via a multi-source orchestration system.

## 🎯 Core Objectives
- **Accessibility**: Provide English translations and pinyin for Chinese lyrics to help non-native speakers understand and sing along.
- **Reliability**: Use a tiered fallback system to ensure lyrics are fetched even when primary AI services or specific music APIs fail.
- **Speed**: Interleave multiple search sources in parallel to provide the best possible variety of results instantly.

---

## 🚀 Key Features

### 1. Multi-Source Search Orchestration
Instead of relying on one provider, Clyricify searches four distinct sources simultaneously:
- **LRCLIB**: An open-source, community-driven lyrics database.
- **NetEase Cloud Music**: One of the largest Chinese music platforms.
- **KuGou Music**: Integrated via the `@meting/core` framework for extensive library coverage.
- **Local Database**: A custom JSON-based storage for pre-processed or favorite songs.
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
- **Stacked View**: Displayed in a vertical "stack" (Chinese -> Pinyin -> English) for easy reading.

---

## 🛠 Technical Specifications

### Tech Stack
- **Frontend**: Nuxt 3 (framework), Vue 3 (components), Tailwind CSS (styling).
- **Backend**: Nuxt Server Engine (H3), Node.js.
- **AI/ML**: Google Gemini 2.5 Flash & 2.5 Flash Lite (for cleaning/metadata).
- **Data Fetching**: Meting-core (Music API wrapper), Fetch API.
- **Linguistic Processing**: `pinyin-pro` for Romanization, Google Translate for English translations.

### Data Architecture
- **Stateless API**: Most song data is fetched on-the-fly to ensure the smallest possible footprint.
- **Metadata JSON**: Standardized objects for song credits (lyricist, composer, arranger, producer).

---

## 🧩 The "Ins and Outs": How it works
1. **Search Phase**: The user types a query. The backend fires 4 parallel requests. They are merged into a single list where labels (**LRCLIB**, **NETEASE**, **KUGOU**, **LOCAL DB**) are applied.
2. **Fetch Phase**: When a song is clicked, the backend hits the specific source's ID.
3. **Processing Phase**:
    - The raw LRC string is stripped of timestamps.
    - The "Cleaned" text is sent through the **Fallback Cascade** to get pure lyrics and structured metadata.
    - The cleaned text is scanned for Chinese characters; if found, Pinyin and Translations are computed.
4. **Render Phase**: The frontend receives a `LyricLine[]` array and maps them into the reactive UI, handling the stacking and formatting.

---

> [!IMPORTANT]
> **Environment Configuration**
> The project relies on two critical keys: `GEMINI_API_KEY` and `GEMINI_API_FALLBACK`.
