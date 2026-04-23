<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-6" @click.self="$emit('close')">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <!-- Modal content -->
      <div class="relative glass-surface rounded-2xl max-w-sm w-full p-8 shadow-2xl shadow-black/50 border border-border-subtle">
        <!-- Close -->
        <button @click="$emit('close')" class="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <h2 class="text-xl font-bold text-text-primary mb-6 text-center">
          {{ isLogin ? 'Welcome Back' : 'Create Account' }}
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">Username</label>
            <input v-model="username" type="text" class="w-full bg-bg-surface border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" required minlength="3" />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Password</label>
            <input v-model="password" type="password" class="w-full bg-bg-surface border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" required minlength="6" />
          </div>

          <div v-if="error" class="text-red-400 text-xs p-2 bg-red-500/10 rounded border border-red-500/20">
            {{ error }}
          </div>

          <button type="submit" :disabled="isLoading" class="w-full bg-accent text-white font-medium py-2.5 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50">
            {{ isLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up') }}
          </button>
        </form>

        <p class="text-center text-xs text-text-muted mt-6">
          {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
          <button @click="isLogin = !isLogin" class="text-accent hover:underline">
            {{ isLogin ? 'Sign up' : 'Log in' }}
          </button>
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{
  close: [],
  success: [user: any]
}>()

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  isLoading.value = true
  
  try {
    const endpoint = isLogin.value ? '/api/auth/login' : '/api/auth/register'
    const data = await $fetch(endpoint, {
      method: 'POST',
      body: { username: username.value, password: password.value }
    })
    
    emit('success', (data as any).user)
    emit('close')
    
    // Reset form
    username.value = ''
    password.value = ''
  } catch (err: any) {
    error.value = err.data?.statusMessage || 'An error occurred'
  } finally {
    isLoading.value = false
  }
}
</script>
