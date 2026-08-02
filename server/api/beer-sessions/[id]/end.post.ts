import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { getFriendIds } from '~~/server/utils/friends'
import { broadcastToUsers } from '~~/server/utils/ws-hub'
import { HttpError, toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const id = getRouterParam(event, 'id')
    const db = useDb()

    const [session] = await db.select().from(tables.beerSessions).where(eq(tables.beerSessions.id, id!)).limit(1)
    if (!session || session.userId !== user.id) {
      throw new HttpError(404, 'Session not found.')
    }

    const [updated] = await db
      .update(tables.beerSessions)
      .set({ endedEarlyAt: new Date() })
      .where(eq(tables.beerSessions.id, id!))
      .returning()

    const friendIds = await getFriendIds(user.id)
    broadcastToUsers(friendIds, { type: 'session:ended', sessionId: id })

    return updated
  } catch (err) {
    throw toH3Error(err)
  }
})
