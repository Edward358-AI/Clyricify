<template>
  <div class="w-full max-w-2xl mx-auto">
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-6 mt-8">
      <div v-for="i in 6" :key="i" class="space-y-2" :style="{ animationDelay: `${i * 100}ms` }">
        <div class="skeleton h-7 rounded" :style="{ width: `${50 + Math.random() * 40}%` }"></div>
        <div class="skeleton h-5 rounded" :style="{ width: `${40 + Math.random() * 30}%` }"></div>
        <div class="skeleton h-4 rounded" :style="{ width: `${45 + Math.random() * 35}%` }"></div>
      </div>
    </div>

    <!-- Lyrics display -->
    <div v-else-if="lyrics.length > 0" class="space-y-1 mt-6">
      <div
        v-for="(line, index) in lyrics"
        :key="index"
        class="group px-4 py-3 rounded-lg
               hover:bg-bg-surface/50
               transition-all duration-200
               animate-fade-in"
        :style="{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }"
      >
        <!-- Plain text line (English / non-Chinese) -->
        <template v-if="line.isPlainText">
          <p class="text-lg font-medium leading-relaxed text-text-primary
                    transition-colors duration-200 group-hover:text-accent">
            {{ line.chinese }}
          </p>
        </template>

        <!-- Chinese line with pinyin + translation -->
        <template v-else>
          <!-- Chinese characters -->
          <p class="text-xl font-semibold leading-relaxed tracking-wide text-text-primary
                    transition-colors duration-200 group-hover:text-accent"
             style="font-family: var(--font-chinese), var(--font-sans);">
            {{ line.chinese }}
          </p>

          <!-- Pinyin -->
          <p v-if="line.pinyin" class="text-sm leading-relaxed text-text-secondary mt-1 italic">
            {{ line.pinyin }}
          </p>

          <!-- English translation -->
          <p v-if="line.english" class="text-sm leading-relaxed text-text-muted mt-0.5">
            {{ line.english }}
          </p>
        </template>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!isLoading && showEmpty" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-16 h-16 rounded-full bg-bg-surface flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-text-muted">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      </div>
      <p class="text-text-muted text-sm">Search for a song to see its lyrics</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LyricLine {
  chinese: string
  pinyin: string
  english: string
  isPlainText?: boolean
}

defineProps<{
  lyrics: LyricLine[]
  isLoading?: boolean
  showEmpty?: boolean
}>()
</script>
