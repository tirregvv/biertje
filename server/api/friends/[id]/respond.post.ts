import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { HttpError, toH3Error } from '~~/server/utils/errors'
import { notify } from '~~/server/utils/notify'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody<{ action: 'accept' | 'decline' }>(event)
    if (!id || !['accept', 'decline'].includes(body.action)) {
      throw new HttpError(400, 'Invalid request.')
    }

    const db = useDb()
    const [friendship] = await db.select().from(tables.friendships).where(eq(tables.friendships.id, id)).limit(1)
    if (!friendship || friendship.addresseeId !== user.id) {
      throw new HttpError(404, 'Friend request not found.')
    }
    if (friendship.status !== 'pending') {
      throw new HttpError(409, 'This request has already been responded to.')
    }

    const [updated] = await db
      .update(tables.friendships)
      .set({ status: body.action === 'accept' ? 'accepted' : 'blocked', respondedAt: new Date() })
      .where(eq(tables.friendships.id, id))
      .returning()

    if (body.action === 'accept') {
      await notify(friendship.requesterId, 'friend_accepted', {
        fromUserId: user.id,
        fromDisplayName: user.displayName,
        message: `${user.displayName} accepted your friend request`
      })
    }

    return updated
  } catch (err) {
    throw toH3Error(err)
  }
})
