<template>
  <div class="relative w-full max-w-2xl mx-auto" ref="searchContainer">
    <div class="relative group">
      <!-- Search icon -->
      <div class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
           :class="isFocused ? 'text-accent' : 'text-text-muted'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>

      <!-- Input -->
      <input
        id="search-input"
        ref="inputRef"
        v-model="searchQuery"
        @focus="isFocused = true"
        @blur="handleBlur"
        type="text"
        placeholder="Search for a Chinese song..."
        autocomplete="off"
        class="w-full pl-12 pr-12 py-4 rounded-xl
               bg-bg-secondary border border-border
               text-text-primary placeholder-text-muted
               text-base font-medium
               outline-none
               transition-all duration-300 ease-out
               focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]
               hover:border-border/80"
      />

      <!-- Clear button -->
      <button
        v-if="searchQuery.length > 0"
        @click="clearSearch"
        class="absolute right-4 top-1/2 -translate-y-1/2
               p-1 rounded-md
               text-text-muted hover:text-text-primary
               hover:bg-bg-hover
               transition-all duration-200
               cursor-pointer"
        aria-label="Clear search"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- Loading spinner -->
      <div v-if="isLoading" class="absolute right-4 top-1/2 -translate-y-1/2">
        <div class="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isLoading?: boolean
}>()

const emit = defineEmits<{
  search: [query: string]
  clear: []
}>()

const searchQuery = ref('')
const isFocused = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const searchContainer = ref<HTMLElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (newVal) => {
  if (debounceTimer) clearTimeout(debounceTimer)

  if (newVal.trim().length === 0) {
    emit('clear')
    return
  }

  debounceTimer = setTimeout(() => {
    emit('search', newVal.trim())
  }, 400)
})

function clearSearch() {
  searchQuery.value = ''
  emit('clear')
  inputRef.value?.focus()
}

function handleBlur() {
  // Small delay so click events on results can fire
  setTimeout(() => {
    isFocused.value = false
  }, 200)
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
