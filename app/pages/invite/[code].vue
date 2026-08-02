<script setup lang="ts">
const route = useRoute()
const code = route.params.code as string

type InviteInfo = { inviterId: string; displayName: string; avatarUrl: string | null; isSelf: boolean; alreadyFriends: boolean }

const { data, error: fetchError } = await useFetch<InviteInfo>(`/api/friends/invite/${code}`)

const accepting = ref(false)
const accepted = ref(false)
const error = ref('')

async function accept() {
  error.value = ''
  accepting.value = true
  try {
    await $fetch(`/api/friends/invite/${code}/accept`, { method: 'POST' })
    accepted.value = true
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Could not add friend.'
  } finally {
    accepting.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
    <template v-if="fetchError">
      <div class="text-4xl">🔗</div>
      <p class="text-sm text-neutral-400">This invite link is invalid or has expired.</p>
      <NuxtLink to="/" class="text-sm text-amber-400">Go home</NuxtLink>
    </template>

    <template v-else-if="data">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-2xl font-semibold text-amber-300">
        {{ data.displayName.slice(0, 1).toUpperCase() }}
      </div>

      <template v-if="data.isSelf">
        <p class="text-sm text-neutral-400">This is your own invite link — share it with a friend instead.</p>
        <NuxtLink to="/friends" class="text-sm text-amber-400">Back to friends</NuxtLink>
      </template>

      <template v-else-if="data.alreadyFriends || accepted">
        <p class="text-lg font-medium">You and {{ data.displayName }} are friends 🎉</p>
        <NuxtLink to="/" class="text-sm text-amber-400">Go to the globe</NuxtLink>
      </template>

      <template v-else>
        <p class="text-lg font-medium">{{ data.displayName }} wants to add you as a friend</p>
        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
        <button
          v-motion :tap="{ scale: 0.97 }"
          :disabled="accepting"
          class="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50"
          @click="accept"
        >
          {{ accepting ? 'Adding…' : `Add ${data.displayName} as a friend` }}
        </button>
      </template>
    </template>
  </div>
</template>
