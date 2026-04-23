<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-6" @click.self="$emit('close')">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <!-- Modal content -->
      <div class="relative glass-surface rounded-2xl max-w-sm w-full p-6 shadow-2xl shadow-black/50 border border-border-subtle">
        <!-- Close -->
        <button @click="$emit('close')" class="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <h2 class="text-lg font-bold text-text-primary mb-4 text-center">Add to Playlist</h2>
        <p class="text-xs text-text-muted text-center mb-4 truncate">{{ song?.name }} - {{ song?.artist }}</p>

        <div v-if="isLoading" class="text-center py-4 text-sm text-text-muted">Loading playlists...</div>
        <div v-else-if="playlists.length === 0" class="text-center py-4 text-sm text-text-muted border border-dashed border-border-subtle rounded-lg">
          No playlists yet. Create one in the sidebar!
        </div>
        <ul v-else class="space-y-2 max-h-60 overflow-y-auto">
          <li v-for="pl in playlists" :key="pl.id">
            <button @click="addToPlaylist(pl)" :disabled="isAdding" class="w-full text-left px-4 py-2 bg-bg-surface hover:bg-bg-hover border border-border-subtle rounded-lg transition-colors text-sm font-medium text-text-primary disabled:opacity-50">
              {{ pl.name }}
            </button>
          </li>
        </ul>
        
        <div v-if="message" class="mt-4 text-center text-xs text-accent">{{ message }}</div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ isOpen: boolean, song: any }>()
const emit = defineEmits<{ close: [], added: [playlistId: string, song: any] }>()

const playlists = ref<any[]>([])
const isLoading = ref(false)
const isAdding = ref(false)
const message = ref('')

watch(() => props.isOpen, (open) => {
  if (open) {
    message.value = ''
    fetchPlaylists()
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

async function addToPlaylist(pl: any) {
  isAdding.value = true
  message.value = ''
  try {
    await $fetch(`/api/playlists/${pl.id}/songs`, {
      method: 'POST',
      body: { song: props.song }
    })
    message.value = 'Added successfully!'
    emit('added', pl.id, props.song)
    setTimeout(() => { emit('close') }, 1000)
  } catch (e: any) {
    if (e.data?.statusCode === 409 || e.response?.status === 409) {
      message.value = 'Already added'
      setTimeout(() => { emit('close') }, 1000)
    } else {
      message.value = e.data?.statusMessage || 'Failed to add'
    }
  } finally {
    isAdding.value = false
  }
}
</script>
