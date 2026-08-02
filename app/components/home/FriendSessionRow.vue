<script setup lang="ts">
import type { FriendWithSession } from '~/utils/friendSession'

const props = defineProps<{ friend: FriendWithSession }>()
defineEmits<{ (e: 'select', friendId: string): void }>()

const active = computed(() => isFriendSessionActive(props.friend.lastSession))
</script>

<template>
  <button
    v-motion :tap="{ scale: 0.98 }"
    class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors"
    :class="active ? 'border-amber-400/50 bg-amber-50' : 'border-neutral-200 bg-neutral-50'"
    @click="$emit('select', friend.id)"
  >
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-sm font-semibold text-amber-600">
      {{ friend.displayName.slice(0, 1).toUpperCase() }}
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium">{{ friend.displayName }}</p>
      <p v-if="active" class="text-xs text-amber-600">
        {{ DRINK_EMOJI[friend.lastSession!.drinkType] ?? '🍻' }} Drinking now
        <span v-if="friend.lastSession!.address" class="text-neutral-500"> · {{ friend.lastSession!.address }}</span>
      </p>
      <p v-else-if="friend.lastSession" class="text-xs text-neutral-500">
        Last drink {{ relativeTimeFromNow(friend.lastSession.startedAt) }}
      </p>
      <p v-else class="text-xs text-neutral-500">No sessions yet</p>
    </div>
  </button>
</template>
