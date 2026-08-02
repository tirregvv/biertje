<script setup lang="ts">
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const { fetch: refreshSession } = useUserSession()
const route = useRoute()
const redirect = computed(() => (typeof route.query.redirect === 'string' ? route.query.redirect : '/'))

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    await refreshSession()
    await navigateTo(redirect.value)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Login failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-6 px-6">
    <div class="text-center">
      <div class="text-5xl">🍻</div>
      <h1 class="mt-2 text-2xl font-semibold">biert</h1>
      <p class="text-sm text-neutral-400">Tap in. Let friends know. Cheers from anywhere.</p>
    </div>

    <form class="w-full max-w-sm space-y-3" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        required
        placeholder="Email"
        class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-400"
      >
      <input
        v-model="password"
        type="password"
        required
        placeholder="Password"
        class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-400"
      >
      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
      <button
        v-motion :tap="{ scale: 0.97 }"
        type="submit"
        :disabled="loading"
        class="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50"
      >
        {{ loading ? 'Logging in…' : 'Log in' }}
      </button>
    </form>

    <div class="flex w-full max-w-sm items-center gap-3 text-xs text-neutral-500">
      <div class="h-px flex-1 bg-white/10" /> or <div class="h-px flex-1 bg-white/10" />
    </div>

    <a
      href="/auth/google"
      class="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium"
    >
      <span>🔎</span> Continue with Google
    </a>

    <NuxtLink :to="{ path: '/signup', query: route.query }" class="text-sm text-neutral-400">
      New here? <span class="text-amber-400">Create an account</span>
    </NuxtLink>
  </div>
</template>
