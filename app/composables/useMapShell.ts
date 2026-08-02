export type SheetSnap = 'closed' | 'peek' | 'full'

export type GlobeApi = {
  flyToLocation: (lat: number, lng: number) => void
  focusSession: (sessionId: string) => void
}

const sheetSnap = ref<SheetSnap>('peek')
const sheetView = ref<'list' | 'detail'>('list')
const selectedFriendId = ref<string | null>(null)
const globeApi = ref<GlobeApi | null>(null)
const myLocation = ref<{ lat: number; lng: number } | null>(null)

/**
 * Singleton state (module-scope refs, not per-call state): the globe + sheet now live at the
 * layout level, above the routed page, since every page's content renders inside the sheet's
 * body. Which friend is focused, how far the sheet is open, and the live geolocation therefore
 * have to survive navigating between tabs instead of resetting on every page mount.
 */
export function useMapShell() {
  return { sheetSnap, sheetView, selectedFriendId, globeApi, myLocation }
}
