import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { areFriends } from '~~/server/utils/friends'
import { broadcastToUsers } from '~~/server/utils/ws-hub'
import { notify } from '~~/server/utils/notify'
import { HttpError, toH3Error } from '~~/server/utils/errors'

const REACTION_TYPES = ['cheers', 'on_my_way', 'raised_glass', 'fire'] as const

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody<{ type: (typeof REACTION_TYPES)[number] }>(event)
    if (!REACTION_TYPES.includes(body.type)) {
      throw new HttpError(400, 'Invalid reaction type.')
    }

    const db = useDb()
    const [session] = await db.select().from(tables.beerSessions).where(eq(tables.beerSessions.id, id!)).limit(1)
    if (!session) throw new HttpError(404, 'Session not found.')

    if (session.userId !== user.id && !(await areFriends(user.id, session.userId))) {
      throw new HttpError(403, 'You can only react to friends\' sessions.')
    }

    const [reaction] = await db
      .insert(tables.reactions)
      .values({ beerSessionId: id!, userId: user.id, type: body.type })
      .returning()

    broadcastToUsers([session.userId], { type: 'reaction:new', sessionId: id, reaction, fromDisplayName: user.displayName })
    if (session.userId !== user.id) {
      await notify(session.userId, 'reaction', { fromUserId: user.id, message: `${user.displayName} reacted ${body.type}` })
    }

    return reaction
  } catch (err) {
    throw toH3Error(err)
  }
})
