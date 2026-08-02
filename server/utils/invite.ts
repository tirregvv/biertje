import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'

export async function getOrCreateInviteCode(userId: string): Promise<string> {
  const db = useDb()
  const [user] = await db.select({ inviteCode: tables.users.inviteCode }).from(tables.users).where(eq(tables.users.id, userId)).limit(1)
  if (user?.inviteCode) return user.inviteCode

  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  await db.update(tables.users).set({ inviteCode: code }).where(eq(tables.users.id, userId))
  return code
}
