<script setup lang="ts">
type Friend = { id: string; displayName: string; avatarUrl: string | null; email: string }
type IncomingRequest = {
  id: string
  requesterId: string
  addresseeId: string
  status: string
  requesterDisplayName: string
  requesterAvatarUrl: string | null
}
type OutgoingRequest = {
  id: string
  requesterId: string
  addresseeId: string
  status: string
  addresseeDisplayName: string
  addresseeAvatarUrl: string | null
}

const { data, refresh, pending } = await useFetch<{
  friends: Friend[]
  incomingRequests: IncomingRequest[]
  outgoingRequests: OutgoingRequest[]
}>('/api/friends')

const email = ref('')
const sending = ref(false)
const error = ref('')
const success = ref('')
const { subscribe: subscribeToPush } = usePushSubscription()
const beerSessions = useBeerSessionsStore()
const { toasts } = useToast()

function activeSessionFor(friendId: string) {
  return beerSessions.active.find((s) => s.userId === friendId) ?? null
}

function canWatch(friendId: string) {
  const session = activeSessionFor(friendId)
  return !!session && session.lat !== null && session.lng !== null
}

function goWatch(friendId: string) {
  const session = activeSessionFor(friendId)
  if (!session || session.lat === null || session.lng === null) return
  navigateTo(`/?focus=${session.id}`)
}

// Keep the friend/request lists live: a new incoming request or an accepted one should
// show up without the user having to manually reload the page.
watch(
  () => toasts.value.length,
  () => {
    const last = toasts.value.at(-1)
    if (last && (last.type === 'friend_request' || last.type === 'friend_accepted')) refresh()
  }
)

async function sendRequest() {
  error.value = ''
  success.value = ''
  sending.value = true
  try {
    await $fetch('/api/friends/request', { method: 'POST', body: { email: email.value } })
    success.value = 'Friend request sent.'
    email.value = ''
    await refresh()
    subscribeToPush().catch(() => {})
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Could not send request.'
  } finally {
    sending.value = false
  }
}

async function respond(id: string, action: 'accept' | 'decline') {
  await $fetch(`/api/friends/${id}/respond`, { method: 'POST', body: { action } })
  await refresh()
}

const copied = ref(false)
async function copyInviteLink() {
  const { code } = await $fetch('/api/friends/invite-link')
  const url = `${window.location.origin}/invite/${code}`
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="h-full overflow-y-auto px-4 py-6">
    <h1 class="text-xl font-semibold">Friends</h1>

    <form class="mt-4 flex gap-2" @submit.prevent="sendRequest">
      <input
        v-model="email"
        type="email"
        required
        placeholder="Friend's email"
        class="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-400"
      >
      <button
        v-motion :tap="{ scale: 0.95 }"
        type="submit"
        :disabled="sending"
        class="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50"
      >
        Add
      </button>
    </form>
    <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
    <p v-if="success" class="mt-2 text-sm text-emerald-400">{{ success }}</p>

    <button
      v-motion :tap="{ scale: 0.97 }"
      class="mt-3 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-neutral-200"
      @click="copyInviteLink"
    >
      {{ copied ? 'Link copied ✓' : '🔗 Copy my invite link' }}
    </button>

    <section v-if="data?.incomingRequests?.length" class="mt-6">
      <h2 class="text-sm font-medium text-neutral-400">Requests</h2>
      <ul class="mt-2 space-y-2">
        <li
          v-for="req in data.incomingRequests"
          :key="req.id"
          class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
        >
          <span class="text-sm">{{ req.requesterDisplayName }}</span>
          <div class="flex gap-2">
            <button class="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300" @click="respond(req.id, 'accept')">Accept</button>
            <button class="rounded-lg bg-white/10 px-3 py-1 text-xs text-neutral-300" @click="respond(req.id, 'decline')">Decline</button>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="data?.outgoingRequests?.length" class="mt-6">
      <h2 class="text-sm font-medium text-neutral-400">Sent requests</h2>
      <ul class="mt-2 space-y-2">
        <li
          v-for="req in data.outgoingRequests"
          :key="req.id"
          class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
        >
          <span class="text-sm">{{ req.addresseeDisplayName }}</span>
          <span class="text-xs text-neutral-500">Pending</span>
        </li>
      </ul>
    </section>

    <section class="mt-6">
      <h2 class="text-sm font-medium text-neutral-400">Your friends</h2>
      <p v-if="!pending && !data?.friends?.length" class="mt-2 text-sm text-neutral-500">
        No friends yet — add someone by email above.
      </p>
      <ul class="mt-2 space-y-2">
        <li v-for="friend in data?.friends" :key="friend.id">
          <button
            class="flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors"
            :class="
              activeSessionFor(friend.id)
                ? 'border-amber-400/40 bg-amber-400/10 active:bg-amber-400/20'
                : 'border-white/10 bg-white/5'
            "
            :disabled="!canWatch(friend.id)"
            @click="goWatch(friend.id)"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/20 text-sm font-semibold text-amber-300">
              {{ friend.displayName.slice(0, 1).toUpperCase() }}
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium">{{ friend.displayName }}</p>
              <p v-if="activeSessionFor(friend.id)" class="text-xs text-amber-300">
                {{ DRINK_EMOJI[activeSessionFor(friend.id)!.drinkType] ?? '🍻' }} Drinking now
                <span v-if="activeSessionFor(friend.id)!.lat === null" class="text-neutral-400"> · Unknown location</span>
                <span v-else-if="activeSessionFor(friend.id)!.address" class="text-neutral-400"> · {{ activeSessionFor(friend.id)!.address }}</span>
              </p>
              <p v-else class="text-xs text-neutral-500">{{ friend.email }}</p>
            </div>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
