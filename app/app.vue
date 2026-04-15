<template>
  <div class="min-h-dvh bg-bg-primary relative overflow-hidden">
    <!-- Subtle background gradient orbs -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-accent/[0.03] blur-[100px]"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/[0.02] blur-[120px]"></div>
    </div>

    <!-- Header -->
    <header class="w-full border-b border-border-subtle">
      <div class="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <span class="text-accent font-bold text-lg leading-none" style="font-family: var(--font-chinese);">词</span>
          </div>
          <h1 class="text-lg font-bold text-text-primary tracking-tight">
            Clyricify
          </h1>
        </div>

        <!-- Right side controls -->
        <div class="flex items-center gap-3">
          <!-- Character toggle (only visible when lyrics are loaded) -->
          <CharacterToggle
            v-if="lyrics.length > 0 && hasChinese"
            v-model:isTraditional="isTraditional"
          />

          <!-- Github button -->
          <a
            href="https://github.com/Edward358-AI/Clyricify"
            target="_blank"
            rel="noopener noreferrer"
            class="p-2 rounded-lg text-text-muted hover:text-text-primary
                   hover:bg-bg-hover transition-all duration-200 cursor-pointer"
            aria-label="GitHub Repository"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
          </a>

          <!-- About button -->
          <button
            @click="showAbout = true"
            class="p-2 rounded-lg text-text-muted hover:text-text-primary
                   hover:bg-bg-hover transition-all duration-200 cursor-pointer"
            aria-label="About Clyricify"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-3xl mx-auto px-6 py-10">
      <!-- Search section -->
      <div class="mb-6">
        <SearchBar
          :is-loading="isSearching"
          @search="handleSearch"
          @clear="handleClearSearch"
        />

        <SearchResults
          v-if="searchResults.length > 0 && !selectedSong"
          :results="searchResults"
          @select="handleSelectSong"
        />
      </div>

      <!-- Selected song info bar -->
      <div v-if="selectedSong" class="animate-fade-in mb-6">
        <div class="glass-surface rounded-xl overflow-hidden">
          <!-- Main song row -->
          <div class="px-5 py-4 flex items-center gap-4">
            <!-- Album art -->
            <div class="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-bg-surface shadow-lg">
              <img
                v-if="selectedSong.coverUrl"
                :src="selectedSong.coverUrl + (selectedSong.source === 'netease' ? '?param=112y112' : '')"
                :alt="selectedSong.album"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-text-muted">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
            </div>

            <!-- Song info -->
            <div class="flex-1 min-w-0">
              <p class="text-base font-semibold text-text-primary truncate">{{ selectedSong.name }}</p>
              <p class="text-sm text-text-muted truncate">{{ selectedSong.artist }}</p>
            </div>

            <!-- Source badge -->
            <span
              class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
              :class="selectedSong.source === 'lrclib'
                ? 'bg-emerald-500/10 text-emerald-400'
                : selectedSong.source === 'netease'
                  ? 'bg-sky-500/10 text-sky-400'
                  : selectedSong.source === 'kugou'
                    ? 'bg-fuchsia-500/10 text-fuchsia-400'
                    : 'bg-amber-500/10 text-amber-500'"
            >
              {{ selectedSong.source === 'lrclib' ? 'LRCLIB' : selectedSong.source === 'netease' ? 'NetEase' : selectedSong.source === 'kugou' ? 'KuGou' : 'LOCAL DB' }}
            </span>

            <!-- Expand details button -->
            <button
              @click="showDetails = !showDetails"
              class="flex-shrink-0 p-2 rounded-lg
                     text-text-muted hover:text-text-primary
                     hover:bg-bg-hover
                     transition-all duration-200
                     cursor-pointer"
              aria-label="Toggle song details"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="transition-transform duration-200"
                   :class="showDetails ? 'rotate-180' : ''">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            <!-- Close button -->
            <button
              @click="clearSelection"
              class="flex-shrink-0 p-2 rounded-lg
                     text-text-muted hover:text-text-primary
                     hover:bg-bg-hover
                     transition-all duration-200
                     cursor-pointer"
              aria-label="Clear selection"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Expandable details panel -->
          <Transition name="expand">
            <div v-if="showDetails" class="border-t border-border-subtle px-5 py-4">
              <div class="grid grid-cols-2 gap-x-6 gap-y-2.5">
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-text-muted/60 font-medium">Song</span>
                  <p class="text-sm text-text-primary mt-0.5">{{ selectedSong.name || '-' }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-text-muted/60 font-medium">Artist</span>
                  <p class="text-sm text-text-primary mt-0.5">{{ selectedSong.artist || '-' }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-text-muted/60 font-medium">Album</span>
                  <p class="text-sm text-text-primary mt-0.5">{{ selectedSong.album || '-' }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-text-muted/60 font-medium">Lyricist</span>
                  <p class="text-sm text-text-primary mt-0.5">{{ formatMeta(songMeta.lyricist) }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-text-muted/60 font-medium">Composer</span>
                  <p class="text-sm text-text-primary mt-0.5">{{ formatMeta(songMeta.composer) }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-text-muted/60 font-medium">Arranger</span>
                  <p class="text-sm text-text-primary mt-0.5">{{ formatMeta(songMeta.arranger) }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-text-muted/60 font-medium">Producer</span>
                  <p class="text-sm text-text-primary mt-0.5">{{ formatMeta(songMeta.producer) }}</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="animate-fade-in mb-6">
        <div class="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
          {{ error }}
        </div>
      </div>

      <!-- Lyrics area -->
      <LyricsDisplay
        :lyrics="displayLyrics"
        :is-loading="isLoadingLyrics"
        :show-empty="!selectedSong && searchResults.length === 0"
      />
    </main>

    <!-- Footer -->
    <footer class="w-full border-t border-border-subtle mt-auto">
      <div class="max-w-3xl mx-auto px-6 py-4 text-center">
        <p class="text-xs text-text-muted/50">
          Lyrics sourced from LRCLIB · NetEase · KuGou · LOCAL DB · Translations via Google
        </p>
      </div>
    </footer>

    <!-- About Modal -->
    <Transition name="modal">
      <div
        v-if="showAbout"
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
        @click.self="showAbout = false"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

        <!-- Modal content -->
        <div class="relative glass-surface rounded-2xl max-w-md w-full p-8 shadow-2xl shadow-black/50 border border-border-subtle">
          <!-- Close -->
          <button
            @click="showAbout = false"
            class="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary
                   hover:bg-bg-hover transition-all duration-200 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- Header -->
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <span class="text-accent font-bold text-xl leading-none" style="font-family: var(--font-chinese);">词</span>
            </div>
            <div>
              <h2 class="text-lg font-bold text-text-primary">Clyricify</h2>
              <p class="text-xs text-text-muted">Chinese Lyrics with Pinyin & Translation</p>
            </div>
          </div>

          <!-- Description -->
          <p class="text-sm text-text-secondary leading-relaxed mb-6">
            Search for Chinese songs and view lyrics in a stacked format — Chinese characters, Pinyin romanization, and English translations — all in one clean view.
          </p>

          <!-- Features -->
          <div class="space-y-3 mb-6">
            <div class="flex items-start gap-3">
              <span class="text-accent mt-0.5">✦</span>
              <p class="text-sm text-text-secondary"><span class="text-text-primary font-medium">Multi-source search</span> — Results from LRCLIB, NetEase, KuGou, and LOCAL DB combined</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-accent mt-0.5">✦</span>
              <p class="text-sm text-text-secondary"><span class="text-text-primary font-medium">Pinyin generation</span> — Accurate tonal romanization via pinyin-pro</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-accent mt-0.5">✦</span>
              <p class="text-sm text-text-secondary"><span class="text-text-primary font-medium">English translation</span> — Powered by Google Translate</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-accent mt-0.5">✦</span>
              <p class="text-sm text-text-secondary"><span class="text-text-primary font-medium">Character toggle</span> — Instant Simplified ↔ Traditional switching</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-accent mt-0.5">✦</span>
              <p class="text-sm text-text-secondary"><span class="text-text-primary font-medium">Smart Extraction</span> — Copyright filtering & metadata parsing via Gemini AI</p>
            </div>
          </div>

          <!-- Tech stack -->
          <div class="flex flex-wrap gap-2 mb-6">
            <span v-for="tech in ['Nuxt 4', 'Vue 3', 'Tailwind v4', 'pinyin-pro', 'opencc-js', 'Gemini AI']" :key="tech"
              class="text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-md bg-bg-surface text-text-muted border border-border-subtle">
              {{ tech }}
            </span>
          </div>

          <!-- Divider -->
          <div class="border-t border-border-subtle pt-4">
            <p class="text-xs text-text-muted/50 text-center">
              Built with ♡ · No API keys required
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import * as OpenCC from 'opencc-js'

// ── Types ──
interface Song {
  id: string
  name: string
  artist: string
  album?: string
  coverUrl?: string
  duration?: number
  source: 'lrclib' | 'netease' | 'kugou' | 'local'
}

interface LyricLine {
  chinese: string
  pinyin: string
  english: string
  isPlainText?: boolean
}

// ── State ──
const searchResults = ref<Song[]>([])
const selectedSong = ref<Song | null>(null)
const lyrics = ref<LyricLine[]>([])
const isSearching = ref(false)
const isLoadingLyrics = ref(false)
const isTraditional = ref(false)
const error = ref('')
const showAbout = ref(false)
const showDetails = ref(false)
const songMeta = ref<{ lyricist?: string; composer?: string; arranger?: string; producer?: string }>({})
const hasChinese = ref(true)

function formatMeta(val: string | undefined | null) {
  if (!val || val.toLowerCase() === 'null') return '-'
  return val
}

// ── OpenCC converters ──
// T→S: normalize any incoming lyrics to Simplified (canonical form)
const t2sConverter = OpenCC.ConverterFactory(
  OpenCC.Locale.from.tw,
  OpenCC.Locale.to.cn
)
// S→T: convert Simplified to Traditional for display
const s2tConverter = OpenCC.ConverterFactory(
  OpenCC.Locale.from.cn,
  OpenCC.Locale.to.tw
)

// Normalize a line to Simplified Chinese (handles both S and T input)
function toSimplified(text: string): string {
  return t2sConverter(text)
}

// ── Computed: normalize Chinese lines, skip plain text lines ──
const displayLyrics = computed<LyricLine[]>(() => {
  return lyrics.value.map((line) => {
    // Don't convert plain text (English) lines
    if (line.isPlainText) return line

    const simplified = toSimplified(line.chinese)
    return {
      ...line,
      chinese: isTraditional.value ? s2tConverter(simplified) : simplified,
    }
  })
})

// ── Search handler — fires both sources in parallel on the server ──
async function handleSearch(query: string) {
  error.value = ''
  isSearching.value = true
  selectedSong.value = null
  lyrics.value = []

  try {
    const data = await $fetch<{ results: Song[] }>('/api/search', {
      params: { q: query },
    })
    searchResults.value = data.results
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Search failed. Please try again.'
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// ── Clear search ──
function handleClearSearch() {
  searchResults.value = []
  error.value = ''
}

// ── Song selection — source is derived from the prefixed ID ──
async function handleSelectSong(song: Song) {
  error.value = ''
  selectedSong.value = song
  searchResults.value = []
  isLoadingLyrics.value = true
  lyrics.value = []

  try {
    const data = await $fetch<{ success: boolean; lyrics: LyricLine[]; meta?: any; hasChinese?: boolean; error?: string }>('/api/lyrics', {
      params: {
        id: song.id,
        name: song.name,
        artist: song.artist,
      },
    })

    if (data.success) {
      lyrics.value = data.lyrics
      songMeta.value = data.meta || {}
      hasChinese.value = data.hasChinese !== false
    } else {
      error.value = data.error || 'No lyrics found for this song.'
    }
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Failed to load lyrics. Please try again.'
  } finally {
    isLoadingLyrics.value = false
  }
}

// ── Clear selection ──
function clearSelection() {
  selectedSong.value = null
  lyrics.value = []
  error.value = ''
  isTraditional.value = false
  showDetails.value = false
  songMeta.value = {}
  hasChinese.value = true
}
</script>
