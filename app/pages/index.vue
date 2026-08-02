<script setup lang="ts">
import type { FriendWithSession } from '~/utils/friendSession'

const store = useBeerSessionsStore()
const { subscribe: subscribeToPush } = usePushSubscription()
const route = useRoute()
const router = useRouter()
const globeRef = ref<{ flyToLocation: (lat: number, lng: number) => void; focusSession: (sessionId: string) => void } | null>(null)
const myLocation = ref<{ lat: number; lng: number } | null>(null)
let geoWatchId: number | null = null

const { data: friendsData, refresh: refreshFriends } = await useFetch<{ friends: FriendWithSession[] }>('/api/friends')
const friends = computed(() => friendsData.value?.friends ?? [])

const sheetSnap = ref<string>('peek')
const sheetView = ref<'list' | 'detail'>('list')
const selectedFriendId = ref<string | null>(null)
const selectedFriend = computed(() => friends.value.find((f) => f.id === selectedFriendId.value) ?? null)

/** Opens a friend's detail view and, if they have a mappable session, flies the globe there. Used
 * identically whether the friend was selected from the sheet's feed or from a globe marker tap. */
function openFriend(friendId: string) {
  const friend = friends.value.find((f) => f.id === friendId)
  selectedFriendId.value = friendId
  sheetView.value = 'detail'
  sheetSnap.value = 'full'

  const session = friend?.lastSession
  if (session && isFriendSessionActive(session) && session.lat !== null && session.lng !== null) {
    globeRef.value?.focusSession(session.id)
  }
}

/** Marker taps skip openFriend: the marker's own click handler already kicked off the globe's
 * fly-to animation, so calling focusSession again here would immediately cancel it (GlobeMap
 * treats a second flyToSession for the same session as a toggle-off). Collapsing the sheet to
 * its most-closed snap point (instead of 'full') keeps the globe unobstructed for that flight. */
function onMarkerSelect(sessionId: string | null) {
  if (!sessionId) return
  const session = store.active.find((s) => s.id === sessionId)
  if (!session) return
  selectedFriendId.value = session.userId
  sheetView.value = 'detail'
  sheetSnap.value = 'closed'
}

function onHeaderNavClick() {
  if (sheetView.value === 'detail') {
    sheetView.value = 'list'
    selectedFriendId.value = null
  } else {
    sheetSnap.value = 'peek'
  }
}

async function onStarted(session: any) {
  store.upsert(session)
  refreshFriends()
  if (typeof session.lat === 'number' && typeof session.lng === 'number') {
    globeRef.value?.flyToLocation(session.lat, session.lng)
  }
  subscribeToPush().catch(() => {})
}

async function endMine() {
  const mine = store.mine[0]
  if (!mine) return
  await $fetch(`/api/beer-sessions/${mine.id}/end`, { method: 'POST' })
  store.remove(mine.id)
  refreshFriends()
}

onMounted(async () => {
  // Prompt for location + notification permissions up front rather than contextually.
  if ('geolocation' in navigator) {
    geoWatchId = navigator.geolocation.watchPosition(
      (position) => {
        myLocation.value = { lat: position.coords.latitude, lng: position.coords.longitude }
      },
      () => {},
      { enableHighAccuracy: true }
    )
  }
  subscribeToPush().catch(() => {})

  const focusId = route.query.focus
  if (typeof focusId === 'string') {
    const session = store.active.find((s) => s.id === focusId)
    if (session) openFriend(session.userId)
    router.replace({ query: {} })
  }
})

onBeforeUnmount(() => {
  if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId)
})
</script>

<template>
  <div class="relative h-full w-full overflow-hidden">
    <GlobeMap ref="globeRef" :sessions="store.mappable" :my-location="myLocation" @select="onMarkerSelect" />

    <BottomSheet v-model="sheetSnap" :snap-points="{ closed: 0.12, peek: 0.42, full: 0.94 }">
      <template #header>
        <div class="flex items-center justify-between px-2 pt-1">
          <button
            v-motion :tap="{ scale: 0.9 }"
            class="flex h-9 w-9 items-center justify-center rounded-full text-lg text-neutral-500"
            @click="onHeaderNavClick"
          >
            {{ sheetView === 'detail' ? '←' : '⌄' }}
          </button>
          <button
            v-motion :tap="{ scale: 0.9 }"
            class="flex h-9 w-9 items-center justify-center rounded-full text-lg text-neutral-500"
            @click="navigateTo('/settings')"
          >
            ⚙️
          </button>
        </div>
      </template>

      <HomeFriendDetailView v-if="sheetView === 'detail' && selectedFriend" :friend="selectedFriend" />
      <template v-else>
        <HomeProfileHeader />
        <HomeQuickActions :my-location="myLocation" :has-active-session="store.mine.length > 0" @started="onStarted" @end="endMine" />
        <HomeFriendSessionFeed :friends="friends" @select="openFriend" />
      </template>
    </BottomSheet>
  </div>
</template>
