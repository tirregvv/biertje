<script setup lang="ts">
import type { FriendWithSession } from '~/utils/friendSession'

const props = defineProps<{ friend: FriendWithSession }>()

const active = computed(() => isFriendSessionActive(props.friend.lastSession))

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-4 px-4 pb-6">
    <div class="flex items-center gap-3 pt-1">
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-base font-semibold text-amber-600">
        {{ friend.displayName.slice(0, 1).toUpperCase() }}
      </div>
      <div>
        <p class="text-lg font-semibold">{{ friend.displayName }}</p>
        <p class="text-xs text-neutral-500">{{ active ? 'Drinking now' : 'Last session' }}</p>
      </div>
    </div>

    <div v-if="friend.lastSession" class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <p class="text-2xl">{{ DRINK_EMOJI[friend.lastSession.drinkType] ?? '🍻' }}</p>
      <p v-if="friend.lastSession.note" class="mt-2 text-sm text-neutral-800">{{ friend.lastSession.note }}</p>
      <p v-if="friend.lastSession.address" class="mt-1 text-sm text-neutral-500">📍 {{ friend.lastSession.address }}</p>
      <p class="mt-2 text-xs text-neutral-400">{{ formatDate(friend.lastSession.startedAt) }}</p>
    </div>
    <p v-else class="text-sm text-neutral-500">{{ friend.displayName }} hasn't started a session yet.</p>

    <div class="rounded-2xl border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-400">
      💬 Chat coming soon
    </div>
  </div>
</template>
