<script setup lang="ts">
defineProps<{
  myLocation?: { lat: number; lng: number } | null
  hasActiveSession?: boolean
}>()

const emit = defineEmits<{ (e: 'started', session: any): void; (e: 'end'): void }>()

const { share, sharing, copied } = useInviteShare()
</script>

<template>
  <div class="flex items-center gap-2 px-4 py-3">
    <div class="shrink-0">
      <button
        v-if="hasActiveSession"
        v-motion :tap="{ scale: 0.9 }"
        class="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white"
        @click="emit('end')"
      >
        End
      </button>
      <BeerButton v-else :my-location="myLocation" @started="emit('started', $event)" />
    </div>

    <button
      v-motion :tap="{ scale: 0.97 }"
      class="flex-1 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white"
      @click="navigateTo('/friends')"
    >
      View friends
    </button>

    <button
      v-motion :tap="{ scale: 0.9 }"
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-lg text-neutral-600 disabled:opacity-50"
      :disabled="sharing"
      title="Add a friend"
      @click="share"
    >
      {{ copied ? '✓' : '➕' }}
    </button>
  </div>
</template>
