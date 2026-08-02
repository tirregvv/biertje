export type SheetSnap = 'closed' | 'peek' | 'full'

/**
 * Shared reactive state for the persistent globe + sheet shell. The globe/sheet live at the
 * layout level, above the routed page, since every page's content renders inside the sheet's
 * body — so which friend is focused, how open the sheet is, and the live geolocation have to
 * survive navigating between tabs instead of resetting on every page mount.
 *
 * Each piece is its own useState-backed composable (not a bare `const x = ref()` at module scope)
 * per Nuxt's state-management guidance: a module-level ref is shared across server requests and
 * can leak, which is exactly what useState exists to avoid.
 */
export function useSheetSnap() {
  return useState<SheetSnap>('mapShell.sheetSnap', () => 'peek')
}

export function useSheetView() {
  return useState<'list' | 'detail'>('mapShell.sheetView', () => 'list')
}

export function useSelectedFriendId() {
  return useState<string | null>('mapShell.selectedFriendId', () => null)
}

export function useMyLocation() {
  return useState<{ lat: number; lng: number } | null>('mapShell.myLocation', () => null)
}
