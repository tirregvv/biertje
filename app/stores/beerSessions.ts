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
      const { sessions } = await $fetch('/api/beer-sessions')
      this.sessions = sessions as BeerSession[]
      this.loaded = true
    },
    upsert(session: BeerSession) {
      const idx = this.sessions.findIndex((s) => s.id === session.id)
      if (idx >= 0) this.sessions[idx] = session
      else this.sessions.push(session)
    },
    remove(sessionId: string) {
      this.sessions = this.sessions.filter((s) => s.id !== sessionId)
    },
    updateAddress(sessionId: string, address: string | null) {
      const session = this.sessions.find((s) => s.id === sessionId)
      if (session) session.address = address
    }
  }
})
