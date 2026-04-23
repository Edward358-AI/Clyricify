<template>
  <div class="flex items-center gap-1 sm:gap-2">
    <button
      id="character-toggle"
      @click="toggle"
      class="relative flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg
             text-xs sm:text-sm font-medium
             transition-all duration-300 ease-out
             border"
      :class="isTraditional
        ? 'bg-accent/10 border-accent/30 text-accent hover:bg-accent/15'
        : 'bg-bg-surface border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary'"
    >
      <span class="transition-transform duration-300" :class="isTraditional ? 'scale-110' : ''">
        {{ isTraditional ? '繁' : '简' }}
      </span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           class="transition-transform duration-300 sm:w-3 sm:h-3"
           :class="isTraditional ? 'rotate-180' : ''">
        <polyline points="7 10 12 15 17 10"/>
      </svg>
    </button>
    <span class="hidden sm:inline text-xs text-text-muted">
      {{ isTraditional ? 'Traditional' : 'Simplified' }}
    </span>
  </div>
</template>

<script setup lang="ts">
const isTraditional = defineModel<boolean>('isTraditional', { default: false })

function toggle() {
  isTraditional.value = !isTraditional.value
}
</script>
