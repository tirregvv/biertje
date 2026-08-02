export type FriendLastSession = {
  id: string
  userId: string
  lat: number | null
  lng: number | null
  drinkType: string
  note: string | null
  address: string | null
  startedAt: string
  expiresAt: string
  endedEarlyAt: string | null
}

export type FriendWithSession = {
  id: string
  displayName: string
  avatarUrl: string | null
  email: string
  lastSession: FriendLastSession | null
}

export function isFriendSessionActive(session: FriendLastSession | null | undefined): boolean {
  if (!session || session.endedEarlyAt) return false
  return new Date(session.expiresAt).getTime() > Date.now()
}
