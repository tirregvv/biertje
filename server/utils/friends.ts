import { and, eq, or } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'

export async function getFriendIds(userId: string): Promise<string[]> {
  const db = useDb()
  const rows = await db
    .select()
    .from(tables.friendships)
    .where(
      and(
        eq(tables.friendships.status, 'accepted'),
        or(eq(tables.friendships.requesterId, userId), eq(tables.friendships.addresseeId, userId))
      )
    )
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId))
}

export async function areFriends(userIdA: string, userIdB: string): Promise<boolean> {
  const friendIds = await getFriendIds(userIdA)
  return friendIds.includes(userIdB)
}
