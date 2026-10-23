<template>
  <!-- In normal flow above 700px (pushes the page); an overlay at 700px and below, where there is no room to push into -->
  <aside
    class="fixed right-0 top-0 h-dvh shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out z-40 min-[701px]:sticky min-[701px]:z-auto"
    :class="isOpen ? 'w-80' : 'w-0'"
    :inert="!isOpen"
  >
    <div class="w-80 h-full bg-bg-primary border-l border-border-subtle flex flex-col">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
        <h2 class="text-lg font-bold text-text-primary">Your Playlists</h2>
        <button @click="$emit('close')" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- View: Playlist List -->
      <div v-if="!selectedPlaylist" class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <form @submit.prevent="createPlaylist" class="flex gap-2">
          <input v-model="newPlaylistName" type="text" placeholder="New playlist name..." class="flex-1 bg-bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" required />
          <button type="submit" :disabled="isCreating" class="bg-accent text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50">
            Add
          </button>
        </form>

        <div v-if="isLoading" class="text-center py-8 text-text-muted text-sm">Loading...</div>
        <div v-else-if="playlists.length === 0" class="text-center py-8 text-text-muted text-sm border border-dashed border-border-subtle rounded-lg">
          No playlists yet. Create one!
        </div>
        <ul v-else class="space-y-2">
          <li v-for="pl in playlists" :key="pl.id">
            <button @click="selectPlaylist(pl)" class="w-full text-left px-4 py-3 bg-bg-surface hover:bg-bg-hover border border-border-subtle rounded-lg transition-colors flex justify-between items-center group">
              <span class="text-sm font-medium text-text-primary">{{ pl.name }}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted group-hover:text-accent transition-colors">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </li>
        </ul>
      </div>

      <!-- View: Playlist Details (Songs) -->
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <div class="px-4 py-3 bg-bg-surface border-b border-border-subtle flex items-center gap-2">
          <button @click="closePlaylist" class="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="text-sm font-bold text-text-primary truncate">{{ selectedPlaylist.name }}</span>
        </div>

        <!-- Playlist song search -->
        <div v-if="songs.length > 0 || songQuery" class="px-3 pt-3 pb-1">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              v-model="songQuery"
              @keydown.esc="songQuery = ''"
              type="text"
              placeholder="Search this playlist..."
              autocomplete="off"
              class="w-full bg-bg-surface border border-border-subtle rounded-lg pl-9 pr-8 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <button
              v-if="songQuery"
              @click="songQuery = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
              aria-label="Clear playlist search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <div v-if="isLoadingSongs" class="text-center py-8 text-text-muted text-sm">Loading songs...</div>
          <div v-else-if="songs.length === 0" class="text-center py-8 text-text-muted text-sm">
            Playlist is empty. Add songs from search!
          </div>
          <div v-else-if="filteredSongs.length === 0" class="text-center py-8 text-text-muted text-sm">
            No songs match "{{ songQuery.trim() }}"
          </div>
          <ul v-else class="space-y-1">
            <li v-for="song in filteredSongs" :key="song.id" class="group/song relative">
              <button @click="$emit('play', song)" class="w-full text-left p-2 hover:bg-bg-hover rounded-lg transition-colors flex items-center gap-3 pr-10">
                <img v-if="song.coverUrl" :src="song.coverUrl + '?param=48y48'" class="w-10 h-10 rounded object-cover" />
                <div v-else class="w-10 h-10 rounded bg-bg-surface flex items-center justify-center text-text-muted">♪</div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-text-primary truncate font-medium">{{ song.name }}</p>
                  <p class="text-xs text-text-muted truncate">{{ song.artist }}</p>
                </div>
              </button>
              <button @click.stop="removeSong(song.id)" class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/song:opacity-100 transition-all duration-200 cursor-pointer" title="Remove song">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [], play: [song: any] }>()

const playlists = ref<any[]>([])
const isLoading = ref(false)
const newPlaylistName = ref('')
const isCreating = ref(false)

const selectedPlaylist = ref<any>(null)
const songs = ref<any[]>([])
const isLoadingSongs = ref(false)
const songQuery = ref('')

const filteredSongs = computed(() => {
  const q = songQuery.value.trim().toLowerCase()
  if (!q) return songs.value
  return songs.value.filter(s =>
    [s.name, s.artist, s.album].some(field => field?.toLowerCase().includes(q))
  )
})

watch(() => props.isOpen, (open) => {
  if (open) {
    fetchPlaylists()
    // If a playlist was already selected, refresh its songs dynamically
    if (selectedPlaylist.value) {
      selectPlaylist(selectedPlaylist.value)
    }
  }
})

async function fetchPlaylists() {
  isLoading.value = true
  try {
    const data = await $fetch<{ playlists: any[] }>('/api/playlists')
    playlists.value = data.playlists
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

async function createPlaylist() {
  if (!newPlaylistName.value.trim()) return
  isCreating.value = true
  try {
    const data = await $fetch<{ playlist: any }>('/api/playlists', {
      method: 'POST',
      body: { name: newPlaylistName.value }
    })
    playlists.value.unshift(data.playlist)
    newPlaylistName.value = ''
  } catch (e) {
    console.error(e)
  } finally {
    isCreating.value = false
  }
}

function closePlaylist() {
  selectedPlaylist.value = null
  songQuery.value = ''
}

async function selectPlaylist(pl: any) {
  // Re-selecting the open playlist is a refresh, so keep the user's query
  if (selectedPlaylist.value?.id !== pl.id) songQuery.value = ''
  selectedPlaylist.value = pl
  isLoadingSongs.value = true
  songs.value = []
  try {
    const data = await $fetch<{ songs: any[] }>(`/api/playlists/${pl.id}/songs`)
    songs.value = data.songs
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingSongs.value = false
  }
}

async function removeSong(songId: string) {
  if (!selectedPlaylist.value) return
  
  try {
    await $fetch(`/api/playlists/${selectedPlaylist.value.id}/songs/${songId}`, {
      method: 'DELETE'
    })
    // Remove from local list
    songs.value = songs.value.filter(s => s.id !== songId)
  } catch (e) {
    console.error('Failed to remove song', e)
  }
}

defineExpose({
  refreshPlaylistIfActive: async (playlistId: string) => {
    if (selectedPlaylist.value && selectedPlaylist.value.id === playlistId) {
      await selectPlaylist(selectedPlaylist.value)
    }
  }
})
</script>
