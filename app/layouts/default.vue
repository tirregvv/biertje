<script setup lang="ts">
const route = useRoute()
const { loggedIn } = useUserSession()
const { connect, disconnect } = useSessionsSocket()
const store = useBeerSessionsStore()

const navItems = [
  { to: '/', icon: '🌍', label: 'Globe' },
  { to: '/friends', icon: '🤝', label: 'Friends' },
  { to: '/challenge', icon: '🎯', label: 'Challenge' },
  { to: '/settings', icon: '⚙️', label: 'Settings' }
]

const showNav = computed(() => loggedIn.value && !['/login', '/signup'].includes(route.path))

// Kept alive at the layout level (not per-page) so realtime toasts and beer-session
// data work app-wide — e.g. the friends page needs to know who's drinking right now.
watch(
  loggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      store.fetchAll()
      connect()
    } else {
      disconnect()
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => disconnect())
</script>

<template>
  <div class="flex h-full flex-col">
    <ToastContainer />

    <main class="flex-1 overflow-hidden">
      <slot />
    </main>

    <nav
      v-if="showNav"
      class="flex shrink-0 items-stretch justify-around border-t border-white/10 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        v-slot="{ isActive }"
        class="flex-1"
      >
        <button
          v-motion
          :initial="{ scale: 1 }"
          :tap="{ scale: 0.9 }"
          class="flex w-full flex-col items-center gap-0.5 py-2 text-xs transition-colors"
          :class="isActive ? 'text-amber-400' : 'text-neutral-400'"
        >
          <span class="text-xl leading-none">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </NuxtLink>
    </nav>
  </div>
</template>
