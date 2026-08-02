<script setup lang="ts">
import type { FriendWithSession } from '~/utils/friendSession'

const props = defineProps<{ friends: FriendWithSession[] }>()
defineEmits<{ (e: 'select', friendId: string): void }>()

function activityTimestamp(friend: FriendWithSession) {
  return friend.lastSession ? new Date(friend.lastSession.startedAt).getTime() : 0
}

const sorted = computed(() =>
  [...props.friends].sort((a, b) => {
    const aActive = isFriendSessionActive(a.lastSession)
    const bActive = isFriendSessionActive(b.lastSession)
    if (aActive !== bActive) return aActive ? -1 : 1
    return activityTimestamp(b) - activityTimestamp(a)
  })
)
</script>

<template>
  <div class="space-y-2 px-4 pb-6">
    <h2 class="px-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Friends</h2>
    <p v-if="sorted.length === 0" class="px-1 text-sm text-neutral-500">
      No friends yet — add someone to see their sessions here.
    </p>
    <HomeFriendSessionRow v-for="friend in sorted" :key="friend.id" :friend="friend" @select="$emit('select', $event)" />
  </div>
</template>
