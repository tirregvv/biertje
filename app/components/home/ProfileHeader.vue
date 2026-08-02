<script setup lang="ts">
const { user } = useUserSession()
const { data: stats } = useProfileStats()

function formatCount(n: number) {
  return n.toLocaleString()
}
</script>

<template>
  <div class="flex items-center gap-3 px-4 pt-3">
    <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-lg font-semibold text-amber-500">
      {{ user?.displayName?.slice(0, 1).toUpperCase() }}
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-lg font-semibold">{{ user?.displayName }}</p>
      <div class="mt-0.5 flex gap-4 text-xs text-neutral-500">
        <span><strong class="font-semibold text-neutral-800">{{ formatCount(stats?.allTimeDrinks ?? 0) }}</strong> all time</span>
        <span><strong class="font-semibold text-neutral-800">{{ formatCount(stats?.drinksThisWeek ?? 0) }}</strong> this week</span>
        <span><strong class="font-semibold text-neutral-800">{{ formatCount(stats?.friendsCount ?? 0) }}</strong> friends</span>
      </div>
    </div>
  </div>
</template>
