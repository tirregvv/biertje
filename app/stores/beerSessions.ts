export type BeerSession = {
  id: string
  userId: string
  lat: number | null
  lng: number | null
  drinkType: string
  note: string | null
  address: string | null
  startedAt: string
  expiresAt: string
  displayName: string
  avatarUrl: string | null
}

// Module-scope (not state): `fetchAll` is now called repeatedly to reconcile after any
// websocket gap (reconnect, tab resume, network return), not just once at boot — these track
// that so concurrent calls collapse into one request and a slow response can't clobber
// something a live push wrote in the meantime. Safe as module scope because `ssr: false` means
// no cross-request sharing.
let inFlight: Promise<void> | null = null
let touchedDuringFetch: Set<string> | null = null
let lastSyncAt = 0

export const useBeerSessionsStore = defineStore('beerSessions', {
  state: () => ({
    sessions: [] as BeerSession[],
    loaded: false
  }),
  getters: {
    active(state): BeerSession[] {
      const now = Date.now()
      return state.sessions.filter((s) => new Date(s.expiresAt).getTime() > now)
    },
    mine(): BeerSession[] {
      const { user } = useUserSession()
      return this.active.filter((s) => s.userId === user.value?.id)
    },
    /** Active sessions that actually have coordinates and can be shown as a pin on the globe. */
    mappable(): (BeerSession & { lat: number; lng: number })[] {
      return this.active.filter((s): s is BeerSession & { lat: number; lng: number } => s.lat !== null && s.lng !== null)
    }
  },
  actions: {
    async fetchAll() {
      if (inFlight) return inFlight

      inFlight = (async () => {
        touchedDuringFetch = new Set()
        try {
          const { sessions } = await $fetch('/api/beer-sessions', { timeout: 8000 })
          // A live push during this request is strictly newer than the snapshot it raced —
          // let it win instead of wholesale-replacing (which would occasionally erase a
          // just-arrived session or resurrect one that was just removed).
          const touched = touchedDuringFetch!
          const local = this.sessions
          this.sessions = [...(sessions as BeerSession[]).filter((r) => !touched.has(r.id)), ...local.filter((s) => touched.has(s.id))]
          this.loaded = true
          lastSyncAt = Date.now()
        } finally {
          touchedDuringFetch = null
          inFlight = null
        }
      })()
      return inFlight
    },
    /** Re-syncs from the server without needing to know why the client might be stale (a
     * websocket gap could be a reconnect, a backgrounded/suspended tab, or anything else) —
     * throttled and never throws, so it's safe to call from any "we might be behind" trigger. */
    reconcile(opts?: { maxAgeMs?: number }) {
      if (inFlight) return inFlight
      if (Date.now() - lastSyncAt < (opts?.maxAgeMs ?? 2000)) return
      return this.fetchAll().catch(() => {})
    },
    upsert(session: BeerSession) {
      touchedDuringFetch?.add(session.id)
      const idx = this.sessions.findIndex((s) => s.id === session.id)
      if (idx >= 0) this.sessions[idx] = session
      else this.sessions.push(session)
    },
    remove(sessionId: string) {
      touchedDuringFetch?.add(sessionId)
      this.sessions = this.sessions.filter((s) => s.id !== sessionId)
    },
    updateAddress(sessionId: string, address: string | null) {
      touchedDuringFetch?.add(sessionId)
      const session = this.sessions.find((s) => s.id === sessionId)
      if (session) session.address = address
    }
  }
})
