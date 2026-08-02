<script setup lang="ts">
import type { FriendWithSession } from '~/utils/friendSession'

const route = useRoute()
const router = useRouter()
const store = useBeerSessionsStore()
const { subscribe: subscribeToPush } = usePushSubscription()
const { sheetView, selectedFriendId, globeApi, myLocation } = useMapShell()

const { data: friendsData, refresh: refreshFriends } = await useFetch<{ friends: FriendWithSession[] }>('/api/friends')
const friends = computed(() => friendsData.value?.friends ?? [])
const selectedFriend = computed(() => friends.value.find((f) => f.id === selectedFriendId.value) ?? null)

/** Opens a friend's detail view and, if they have a mappable session, flies the globe there. Used
 * both when picking a friend from the feed and when arriving via a `?focus=` deep link. Marker
 * taps on the globe itself go through the layout instead — see its onMarkerSelect for why. */
function openFriend(friendId: string) {
  const friend = friends.value.find((f) => f.id === friendId)
  selectedFriendId.value = friendId
  sheetView.value = 'detail'

  const session = friend?.lastSession
  if (session && isFriendSessionActive(session) && session.lat !== null && session.lng !== null) {
    globeApi.value?.focusSession(session.id)
  }
}

function closeFriend() {
  sheetView.value = 'list'
  selectedFriendId.value = null
}

async function onStarted(session: any) {
  store.upsert(session)
  refreshFriends()
  if (typeof session.lat === 'number' && typeof session.lng === 'number') {
    globeApi.value?.flyToLocation(session.lat, session.lng)
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

onMounted(() => {
  subscribeToPush().catch(() => {})

  const focusId = route.query.focus
  if (typeof focusId === 'string') {
    const session = store.active.find((s) => s.id === focusId)
    if (session) openFriend(session.userId)
    router.replace({ query: {} })
  }
})
</script>

<template>
  <div v-if="sheetView === 'detail' && selectedFriend">
    <button class="flex items-center gap-1 px-4 pt-2 text-sm text-neutral-500" @click="closeFriend">← Back</button>
    <HomeFriendDetailView :friend="selectedFriend" />
  </div>
  <template v-else>
    <HomeProfileHeader />
    <HomeQuickActions :my-location="myLocation" :has-active-session="store.mine.length > 0" @started="onStarted" @end="endMine" />
    <HomeFriendSessionFeed :friends="friends" @select="openFriend" />
  </template>
</template>
