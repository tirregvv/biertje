export type SessionUser = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  defaultSessionMinutes: number
}

export async function requireSessionUser(event: any): Promise<SessionUser> {
  const session = await requireUserSession(event)
  return session.user as SessionUser
}
