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
          <div class="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <span class="text-accent font-bold text-base leading-none" style="font-family: var(--font-chinese);">词</span>
          </div>
          <h1 class="text-base sm:text-lg font-bold text-text-primary tracking-tight">
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

          <!-- Account Dropdown -->
          <div class="relative">
            <!-- Account Icon Button -->
            <button
              @click="showAccountDropdown = !showAccountDropdown"
              class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-200"
              title="Account"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>

            <!-- Overlay to close dropdown when clicking outside -->
            <div v-if="showAccountDropdown" class="fixed inset-0 z-40" @click="showAccountDropdown = false"></div>

            <!-- Dropdown Menu -->
            <Transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <div v-if="showAccountDropdown" class="absolute right-0 mt-2 w-48 bg-bg-surface border border-border-subtle rounded-xl shadow-xl z-50 overflow-hidden">
                <template v-if="currentUser">
                  <div class="px-4 py-3 border-b border-border-subtle">
                    <p class="text-sm font-medium text-text-primary truncate">{{ currentUser.username }}</p>
                  </div>
                  <div class="p-1">
                    <button @click="showPlaylists = true; showAccountDropdown = false" class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors">
                      View Playlists
                    </button>
                  </div>
                  <div class="p-1 border-t border-border-subtle">
                    <button @click="logout(); showAccountDropdown = false" class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      Log Out
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div class="p-1">
                    <button @click="showAuthModal = true; showAccountDropdown = false" class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors">
                      Log In / Sign Up
                    </button>
                  </div>
                </template>
              </div>
            </Transition>
          </div>

          <!-- Github button -->
          <a
            href="https://github.com/Edward358-AI/Clyricify"
            target="_blank"
            rel="noopener noreferrer"
            class="p-2 rounded-lg text-text-muted hover:text-text-primary
                   hover:bg-bg-hover transition-all duration-200"
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
                   hover:bg-bg-hover transition-all duration-200"
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
          v-if="searchResults.length > 0"
          :results="searchResults"
          @select="s => handleSelectSong(s, 'search')"
          @addToPlaylist="handleAddToPlaylist"
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

            <!-- Add to Playlist button -->
            <button
              @click="handleAddToPlaylist(selectedSong)"
              class="flex-shrink-0 p-2 rounded-lg text-text-muted hover:text-accent hover:bg-bg-surface transition-all duration-200"
              title="Add to Playlist"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>

            <!-- Refresh button -->
            <button
              @click="handleManualRefresh"
              :disabled="isRefreshing"
              class="flex-shrink-0 p-2 rounded-lg text-text-muted hover:text-accent hover:bg-bg-surface transition-all duration-200 disabled:opacity-50"
              title="Refresh Lyrics"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{'animate-spin': isRefreshing}">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>

            <!-- Expand details button -->
            <button
              @click="showDetails = !showDetails"
              class="flex-shrink-0 p-2 rounded-lg
                     text-text-muted hover:text-text-primary
                     hover:bg-bg-hover
                     transition-all duration-200"
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
                     transition-all duration-200"
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

    <AuthModal
      :isOpen="showAuthModal"
      @close="showAuthModal = false"
      @success="handleLoginSuccess"
    />

    <PlaylistsSidebar
      ref="playlistsSidebarRef"
      :isOpen="showPlaylists"
      @close="showPlaylists = false"
      @play="handlePlayFromPlaylist"
    />

    <PlaylistSelectorModal
      :isOpen="showPlaylistSelector"
      :song="songToAddToPlaylist"
      @close="showPlaylistSelector = false"
      @added="handleSongAddedToPlaylist"
    />

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
import { onMounted } from 'vue'

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
const isRefreshing = ref(false)
const refreshCooldowns = ref<Record<string, number>>({})
const isTraditional = ref(false)
const error = ref('')
const showAbout = ref(false)
const showDetails = ref(false)
const songMeta = ref<{ lyricist?: string; composer?: string; arranger?: string; producer?: string }>({})
const hasChinese = ref(true)

const currentUser = ref<any>(null)
const showAuthModal = ref(false)
const showPlaylists = ref(false)
const playlistsSidebarRef = ref<any>(null)
const showPlaylistSelector = ref(false)
const showAccountDropdown = ref(false)
const songToAddToPlaylist = ref<Song | null>(null)

onMounted(async () => {
  try {
    const data = await $fetch<{ user: any }>('/api/auth/me')
    currentUser.value = data.user
  } catch (e) {
    // Not logged in
  }

  // Connect to Server-Sent Events stream for background updates
  if (import.meta.client) {
    const eventSource = new EventSource('/api/stream')
    
    eventSource.addEventListener('lyrics_updated', (event) => {
      try {
        const data = JSON.parse(event.data)
        // If the updated song is the one currently being displayed, hot-swap it!
        if (selectedSong.value && data.id === selectedSong.value.id) {
          lyrics.value = data.lyrics
          songMeta.value = data.meta || {}
          hasChinese.value = data.hasChinese !== false
          console.log(`[Hot Swap] Lyrics for ${data.id} updated in background!`)
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err)
      }
    })
  }
})

function handleLoginSuccess(user: any) {
  currentUser.value = user
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  currentUser.value = null
  showPlaylists.value = false
}

function handleAddToPlaylist(song: Song) {
  if (!currentUser.value) {
    showAuthModal.value = true
    return
  }
  songToAddToPlaylist.value = song
  showPlaylistSelector.value = true
}

function handleSongAddedToPlaylist(playlistId: string, song: any) {
  if (playlistsSidebarRef.value) {
    playlistsSidebarRef.value.refreshPlaylistIfActive(playlistId)
  }
}

async function handlePlayFromPlaylist(song: any) {
  await handleSelectSong(song as Song, 'playlist')
}

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
async function handleSelectSong(song: Song, context: 'search' | 'playlist' = 'search') {
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
        context
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

async function handleManualRefresh() {
  if (!selectedSong.value || isRefreshing.value) return;
  
  const now = Date.now();
  const lastRefresh = refreshCooldowns.value[selectedSong.value.id] || 0;
  // 60 second cooldown per song
  if (now - lastRefresh < 60000) {
    error.value = "Please wait a moment before refreshing this song again.";
    return;
  }
  
  isRefreshing.value = true;
  error.value = '';
  
  try {
    const data = await $fetch<{ success: boolean; lyrics: LyricLine[]; meta?: any; hasChinese?: boolean; error?: string }>('/api/lyrics', {
      params: {
        id: selectedSong.value.id,
        name: selectedSong.value.name,
        artist: selectedSong.value.artist,
        forceRefresh: 'true'
      },
    })

    if (data.success) {
      lyrics.value = data.lyrics
      songMeta.value = data.meta || {}
      hasChinese.value = data.hasChinese !== false
      refreshCooldowns.value[selectedSong.value.id] = Date.now();
    } else {
      error.value = data.error || 'Failed to refresh lyrics.'
    }
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Failed to refresh lyrics.'
  } finally {
    isRefreshing.value = false;
  }
}
</script>
