<script setup lang="ts">
type Settings = {
  displayName: string
  email: string
  avatarUrl: string | null
  defaultSessionMinutes: number
  notificationPrefs: {
    friendRequest: boolean
    friendSessionStarted: boolean
    reaction: boolean
    dailyChallenge: boolean
  }
}

const { data, refresh } = await useFetch<Settings>('/api/settings')
const { fetch: refreshSession } = useUserSession()

const displayName = ref(data.value?.displayName ?? '')
const minutes = ref(data.value?.defaultSessionMinutes ?? 15)
const saved = ref(false)

watch(data, (v) => {
  if (!v) return
  displayName.value = v.displayName
  minutes.value = v.defaultSessionMinutes
})

async function saveProfile() {
  saved.value = false
  await $fetch('/api/settings', { method: 'PATCH', body: { displayName: displayName.value, defaultSessionMinutes: minutes.value } })
  await refreshSession()
  await refresh()
  saved.value = true
}

async function togglePref(key: keyof Settings['notificationPrefs']) {
  if (!data.value) return
  data.value.notificationPrefs[key] = !data.value.notificationPrefs[key]
  await $fetch('/api/settings/notifications', { method: 'PATCH', body: { [key]: data.value.notificationPrefs[key] } })
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await refreshSession()
  await navigateTo('/login')
}

const prefLabels: Record<keyof Settings['notificationPrefs'], string> = {
  friendRequest: 'Friend requests',
  friendSessionStarted: 'Friends starting a session',
  reaction: 'Reactions on my sessions',
  dailyChallenge: "Today's challenge"
}
</script>

<template>
  <div class="h-full overflow-y-auto px-4 py-6">
    <h1 class="text-xl font-semibold">Settings</h1>

    <section class="mt-6 space-y-3">
      <h2 class="text-sm font-medium text-neutral-400">Profile</h2>
      <input
        v-model="displayName"
        type="text"
        class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-400"
      >
      <p class="text-xs text-neutral-500">{{ data?.email }}</p>

      <div>
        <label class="flex items-center justify-between text-xs text-neutral-400">
          <span>Default session duration</span>
          <span>{{ minutes }} min</span>
        </label>
        <input v-model.number="minutes" type="range" min="5" max="120" step="5" class="mt-1 w-full accent-amber-400">
      </div>

      <button
        v-motion :tap="{ scale: 0.97 }"
        class="w-full rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-neutral-950"
        @click="saveProfile"
      >
        {{ saved ? 'Saved ✓' : 'Save changes' }}
      </button>
    </section>

    <section v-if="data" class="mt-8 space-y-2">
      <h2 class="text-sm font-medium text-neutral-400">Notifications</h2>
      <label
        v-for="(label, key) in prefLabels"
        :key="key"
        class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm"
      >
        <span>{{ label }}</span>
        <input
          type="checkbox"
          class="h-5 w-5 accent-amber-400"
          :checked="data.notificationPrefs[key]"
          @change="togglePref(key)"
        >
      </label>
    </section>

    <button class="mt-8 w-full rounded-xl border border-white/10 py-2.5 text-sm text-neutral-400" @click="logout">
      Log out
    </button>
  </div>
</template>
