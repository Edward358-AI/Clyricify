<template>
  <Transition name="slide-right">
    <div v-if="isOpen" class="fixed inset-y-0 right-0 z-40 w-80 bg-bg-primary border-l border-border-subtle shadow-2xl flex flex-col">
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
          <button @click="selectedPlaylist = null" class="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="text-sm font-bold text-text-primary truncate">{{ selectedPlaylist.name }}</span>
        </div>
        
        <div class="flex-1 overflow-y-auto p-2">
          <div v-if="isLoadingSongs" class="text-center py-8 text-text-muted text-sm">Loading songs...</div>
          <div v-else-if="songs.length === 0" class="text-center py-8 text-text-muted text-sm">
            Playlist is empty. Add songs from search!
          </div>
          <ul v-else class="space-y-1">
            <li v-for="song in songs" :key="song.id" class="group/song relative">
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
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [], play: [song: any] }>()

const playlists = ref<any[]>([])
const isLoading = ref(false)
const newPlaylistName = ref('')
const isCreating = ref(false)

const selectedPlaylist = ref<any>(null)
const songs = ref<any[]>([])
const isLoadingSongs = ref(false)

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

async function selectPlaylist(pl: any) {
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

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
