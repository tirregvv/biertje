<script setup lang="ts">
const props = defineProps<{
  myLocation?: { lat: number; lng: number } | null
}>()

const emit = defineEmits<{ (e: 'started', session: any): void }>()

const { user } = useUserSession()
const open = ref(false)
const submitting = ref(false)
const error = ref('')
const note = ref('')
const minutes = ref<number>(user.value?.defaultSessionMinutes ?? 15)

const DRINKS = [
  { type: 'beer', emoji: '🍺', label: 'Beer' },
  { type: 'wine', emoji: '🍷', label: 'Wine' },
  { type: 'cocktail', emoji: '🍸', label: 'Cocktail' },
  { type: 'shot', emoji: '🥃', label: 'Shot' },
  { type: 'cider', emoji: '🍏', label: 'Cider' },
  { type: 'non_alcoholic', emoji: '🥤', label: 'N/A' }
] as const

/**
 * Best-effort location lookup — never throws. If geolocation fails or is denied, the session
 * still starts (server falls back to "unknown location" in notifications/messages).
 */
async function getCoords(): Promise<{ lat: number; lng: number } | null> {
  // Reuse the location the home page is already continuously tracking (via watchPosition) —
  // it's instant and avoids forcing a brand-new, failure-prone GPS fix on every tap.
  if (props.myLocation) return props.myLocation

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      })
    })
    return { lat: position.coords.latitude, lng: position.coords.longitude }
  } catch {
    return null
  }
}

async function pick(drinkType: (typeof DRINKS)[number]['type']) {
  error.value = ''
  submitting.value = true
  try {
    const coords = await getCoords()

    const session = await $fetch('/api/beer-sessions', {
      method: 'POST',
      body: {
        lat: coords?.lat,
        lng: coords?.lng,
        drinkType,
        note: note.value || undefined,
        minutes: minutes.value
      }
    })

    emit('started', session)
    open.value = false
    note.value = ''
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Could not start session.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <button
      v-motion
      :initial="{ scale: 1 }"
      :tap="{ scale: 0.9 }"
      class="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-3xl shadow-lg shadow-amber-400/30"
      @click="open = true"
    >
      🍺
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="open" class="fixed inset-0 z-50 bg-black/60" @click="open = false" />
      </Transition>

      <Transition
        enter-active-class="transition duration-250 ease-out"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div
          v-if="open"
          class="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-neutral-900 px-5 pb-8 pt-4"
        >
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
          <h2 class="text-lg font-semibold">What are you having?</h2>

          <div class="mt-4 grid grid-cols-3 gap-3">
            <button
              v-for="drink in DRINKS"
              :key="drink.type"
              v-motion :tap="{ scale: 0.92 }"
              :disabled="submitting"
              class="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/5 py-4 disabled:opacity-40"
              @click="pick(drink.type)"
            >
              <span class="text-2xl">{{ drink.emoji }}</span>
              <span class="text-xs text-neutral-300">{{ drink.label }}</span>
            </button>
          </div>

          <div class="mt-4 space-y-2">
            <input
              v-model="note"
              type="text"
              maxlength="280"
              placeholder="Add a note (optional)"
              class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-400"
            >
            <label class="flex items-center justify-between text-xs text-neutral-400">
              <span>Session length</span>
              <span>{{ minutes }} min</span>
            </label>
            <input v-model.number="minutes" type="range" min="5" max="120" step="5" class="w-full accent-amber-400">
          </div>

          <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
          <p v-if="submitting" class="mt-2 text-sm text-neutral-400">Getting your location…</p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
