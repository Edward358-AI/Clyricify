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
            v-if="lyrics.length > 0"
            v-model:isTraditional="isTraditional"
          />

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
        <div class="glass-surface rounded-xl px-5 py-4 flex items-center gap-4">
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
              : 'bg-sky-500/10 text-sky-400'"
          >
            {{ selectedSong.source === 'lrclib' ? 'LRCLIB' : 'NetEase' }}
          </span>

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
          Lyrics sourced from LRCLIB · NetEase · Translations via Google
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
              <p class="text-sm text-text-secondary"><span class="text-text-primary font-medium">Multi-source search</span> — Results from LRCLIB and NetEase combined</p>
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
          </div>

          <!-- Tech stack -->
          <div class="flex flex-wrap gap-2 mb-6">
            <span v-for="tech in ['Nuxt 4', 'Vue 3', 'Tailwind v4', 'pinyin-pro', 'opencc-js']" :key="tech"
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
  album: string
  coverUrl: string
  duration: number
  source: 'lrclib' | 'netease'
}

interface LyricLine {
  chinese: string
  pinyin: string
  english: string
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

// ── OpenCC converter (Simplified → Traditional) ──
const s2tConverter = OpenCC.ConverterFactory(
  OpenCC.Locale.from.cn,
  OpenCC.Locale.to.tw
)

// ── Computed: apply character conversion ──
const displayLyrics = computed<LyricLine[]>(() => {
  if (!isTraditional.value) return lyrics.value

  return lyrics.value.map((line) => ({
    ...line,
    chinese: s2tConverter(line.chinese),
  }))
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
    const data = await $fetch<{ success: boolean; lyrics: LyricLine[]; error?: string }>('/api/lyrics', {
      params: {
        id: song.id,
        name: song.name,
        artist: song.artist,
      },
    })

    if (data.success) {
      lyrics.value = data.lyrics
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
}
</script>
