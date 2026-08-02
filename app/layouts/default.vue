<script setup lang="ts">
const route = useRoute()
const { loggedIn } = useUserSession()
const { connect, disconnect } = useSessionsSocket()
const store = useBeerSessionsStore()
const { sheetSnap, sheetView, selectedFriendId, globeApi, myLocation } = useMapShell()

const navItems = [
  { to: '/', icon: '🌍', label: 'Globe' },
  { to: '/friends', icon: '🤝', label: 'Friends' },
  { to: '/challenge', icon: '🎯', label: 'Challenge' },
  { to: '/settings', icon: '⚙️', label: 'Settings' }
]

const showShell = computed(() => loggedIn.value && !['/login', '/signup'].includes(route.path))

const globeEl = ref<GlobeApi | null>(null)
watch(globeEl, (el) => (globeApi.value = el))

let geoWatchId: number | null = null

/** Marker taps on the globe should work no matter which tab is currently showing — jump to the
 * Home tab and collapse the sheet to its most-closed snap point so the fly-to animation plays out
 * unobstructed (see GlobeMap's flyToSession, already triggered by the marker's own click handler). */
function onMarkerSelect(sessionId: string | null) {
  if (!sessionId) return
  const session = store.active.find((s) => s.id === sessionId)
  if (!session) return
  selectedFriendId.value = session.userId
  sheetView.value = 'detail'
  sheetSnap.value = 'closed'
  if (route.path !== '/') navigateTo('/')
}

/** Any interaction with the globe itself (pan, zoom, rotate — marker taps already collapse via
 * onMarkerSelect) should get the sheet out of the way so the map is fully usable. */
function onGlobeInteract() {
  sheetSnap.value = 'closed'
}

/** Tapping the active Globe tab while viewing a friend's detail is a quick way back to the feed,
 * mirroring the explicit back button in the Home page's own detail view. */
function onNavClick(to: string) {
  if (to === '/' && route.path === '/' && sheetView.value === 'detail') {
    sheetView.value = 'list'
    selectedFriendId.value = null
  }
}

// Friends/Challenge/Settings are full pages, not a quick-glance widget like the Home feed — expand
// the sheet so they're actually usable (the sheet's content only scrolls at its fullest snap
// point). Coming back to Globe restores the peek glance, unless a friend's detail is open (left
// expanded/closed by openFriend/onMarkerSelect) — this also covers the initial mount on
// /login or /signup (path !== '/'), which would otherwise leave 'full' stuck for whichever
// showShell route is visited first.
watch(
  () => route.path,
  (path) => {
    if (path === '/') {
      if (sheetView.value !== 'detail') sheetSnap.value = 'peek'
    } else {
      sheetSnap.value = 'full'
    }
  },
  { immediate: true }
)

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

onMounted(() => {
  if ('geolocation' in navigator) {
    geoWatchId = navigator.geolocation.watchPosition(
      (position) => {
        myLocation.value = { lat: position.coords.latitude, lng: position.coords.longitude }
      },
      () => {},
      { enableHighAccuracy: true }
    )
  }
})

onBeforeUnmount(() => {
  disconnect()
  if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId)
})
</script>

<template>
  <div class="flex h-full flex-col">
    <ToastContainer />

    <div v-if="showShell" class="relative flex-1 overflow-hidden">
      <GlobeMap
        ref="globeEl"
        :sessions="store.mappable"
        :my-location="myLocation"
        @select="onMarkerSelect"
        @interact="onGlobeInteract"
      />

      <BottomSheet v-model="sheetSnap" :snap-points="{ closed: 0.13, peek: 0.42, full: 0.94 }">
        <template #header>
          <nav class="flex items-stretch justify-around px-1 pb-1.5 pt-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              v-slot="{ isActive }"
              class="flex-1"
            >
              <button
                v-motion :tap="{ scale: 0.9 }"
                class="flex w-full flex-col items-center gap-0.5 py-1 text-xs transition-colors"
                :class="isActive ? 'text-amber-500' : 'text-neutral-400'"
                @click="onNavClick(item.to)"
              >
                <span class="text-xl leading-none">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            </NuxtLink>
          </nav>
        </template>

        <slot />
      </BottomSheet>
    </div>

    <main v-else class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>
