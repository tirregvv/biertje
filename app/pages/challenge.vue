<script setup lang="ts">
type TodayChallenge = {
  challenge: { dailyChallengeId: string; date: string; text: string; category: string; difficulty: string } | null
  completed: boolean
  streak: number
}

const { data, refresh, pending } = await useFetch<TodayChallenge>('/api/challenge/today')
const completing = ref(false)

async function complete() {
  completing.value = true
  try {
    await $fetch('/api/challenge/complete', { method: 'POST' })
    await refresh()
  } finally {
    completing.value = false
  }
}

const difficultyColor: Record<string, string> = {
  easy: 'text-emerald-300 bg-emerald-500/10',
  medium: 'text-amber-300 bg-amber-500/10',
  hard: 'text-red-300 bg-red-500/10'
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
    <div v-if="pending" class="text-sm text-neutral-500">Loading today's challenge…</div>

    <template v-else-if="data?.challenge">
      <div class="text-4xl">🎯</div>
      <span
        class="rounded-full px-3 py-1 text-xs font-medium"
        :class="difficultyColor[data.challenge.difficulty]"
      >
        {{ data.challenge.category }} · {{ data.challenge.difficulty }}
      </span>
      <p class="max-w-sm text-lg font-medium">{{ data.challenge.text }}</p>

      <button
        v-motion :tap="{ scale: 0.96 }"
        :disabled="data.completed || completing"
        class="rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60"
        :class="data.completed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-400 text-neutral-950'"
        @click="complete"
      >
        {{ data.completed ? '✓ Completed' : completing ? 'Marking done…' : 'Mark as done' }}
      </button>

      <p v-if="data.streak > 0" class="text-sm text-neutral-400">🔥 {{ data.streak }}-day streak</p>
    </template>

    <p v-else class="text-sm text-neutral-500">
      No challenge yet today — check back after the daily reset.
    </p>
  </div>
</template>
