import { and, eq, gt, inArray, isNull } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { getFriendIds } from '~~/server/utils/friends'
import { toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const db = useDb()
    const friendIds = await getFriendIds(user.id)
    const visibleUserIds = [user.id, ...friendIds]

    const rows = await db
      .select({
        id: tables.beerSessions.id,
        userId: tables.beerSessions.userId,
        lat: tables.beerSessions.lat,
        lng: tables.beerSessions.lng,
        drinkType: tables.beerSessions.drinkType,
        note: tables.beerSessions.note,
        address: tables.beerSessions.address,
        startedAt: tables.beerSessions.startedAt,
        expiresAt: tables.beerSessions.expiresAt,
        displayName: tables.users.displayName,
        avatarUrl: tables.users.avatarUrl
      })
      .from(tables.beerSessions)
      .innerJoin(tables.users, eq(tables.users.id, tables.beerSessions.userId))
      .where(
        and(
          inArray(tables.beerSessions.userId, visibleUserIds),
          gt(tables.beerSessions.expiresAt, new Date()),
          isNull(tables.beerSessions.endedEarlyAt)
        )
      )

    return { sessions: rows }
  } catch (err) {
    throw toH3Error(err)
  }
})
