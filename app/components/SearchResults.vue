<template>
  <div v-if="results.length > 0" class="w-full max-w-2xl mx-auto mt-2 animate-slide-down">
    <div class="glass-surface rounded-xl overflow-hidden shadow-2xl shadow-black/30">
      <div class="max-h-[400px] overflow-y-auto">
        <button
          v-for="(song, index) in results"
          :key="song.id"
          @click="$emit('select', song)"
          class="w-full flex items-center gap-4 px-4 py-3
                 hover:bg-bg-hover
                 transition-colors duration-150
                 border-b border-border-subtle last:border-b-0
                 text-left"
          :style="{ animationDelay: `${index * 40}ms` }"
        >
          <!-- Album art -->
          <div class="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-bg-surface">
            <img
              v-if="song.coverUrl"
              :src="song.coverUrl + '?param=96y96'"
              :alt="song.album"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-text-muted">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
          </div>

          <!-- Song info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-text-primary truncate">
              {{ song.name }}
            </p>
            <p class="text-xs text-text-muted truncate mt-0.5">
              {{ song.artist }}
              <span v-if="song.album" class="text-text-muted/50"> · {{ song.album }}</span>
            </p>
          </div>

          <!-- Source tag -->
          <span
            class="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider
                   px-1.5 py-0.5 rounded-md"
            :class="song.source === 'lrclib'
              ? 'bg-emerald-500/10 text-emerald-400'
              : song.source === 'netease'
                ? 'bg-sky-500/10 text-sky-400'
                : song.source === 'kugou'
                  ? 'bg-fuchsia-500/10 text-fuchsia-400'
                  : 'bg-amber-500/10 text-amber-500'"
          >
            {{ song.source === 'lrclib' ? 'LRCLIB' : song.source === 'netease' ? 'NetEase' : song.source === 'kugou' ? 'KuGou' : 'Local DB' }}
          </span>

          <!-- Duration -->
          <div class="flex-shrink-0 text-xs text-text-muted tabular-nums">
            {{ formatDuration(song.duration as number) }}
          </div>

          <!-- Add to Playlist Button -->
          <button
            @click.stop="$emit('addToPlaylist', song)"
            class="flex-shrink-0 p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-bg-surface transition-colors"
            title="Add to Playlist"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>

          <!-- Arrow -->
          <div class="flex-shrink-0 text-text-muted/40 ml-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Song {
  id: string
  name: string
  artist: string
  album?: string
  coverUrl?: string
  duration?: number
  source: 'lrclib' | 'netease' | 'kugou' | 'local'
}

defineProps<{
  results: Song[]
}>()

defineEmits<{
  select: [song: Song]
  addToPlaylist: [song: Song]
}>()

function formatDuration(ms: number): string {
  if (!ms) return ''
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>
