import { and, count, eq, gte, or } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { toH3Error } from '~~/server/utils/errors'

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = (day + 6) % 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - diffToMonday)
  return d
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const db = useDb()

    const [[allTime], [thisWeek], [friends]] = await Promise.all([
      db.select({ value: count() }).from(tables.beerSessions).where(eq(tables.beerSessions.userId, user.id)),
      db
        .select({ value: count() })
        .from(tables.beerSessions)
        .where(and(eq(tables.beerSessions.userId, user.id), gte(tables.beerSessions.startedAt, startOfWeek(new Date())))),
      db
        .select({ value: count() })
        .from(tables.friendships)
        .where(
          and(
            eq(tables.friendships.status, 'accepted'),
            or(eq(tables.friendships.requesterId, user.id), eq(tables.friendships.addresseeId, user.id))
          )
        )
    ])

    return {
      allTimeDrinks: allTime.value,
      drinksThisWeek: thisWeek.value,
      friendsCount: friends.value
    }
  } catch (err) {
    throw toH3Error(err)
  }
})
