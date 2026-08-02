import { and, eq, or } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { HttpError, toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const code = getRouterParam(event, 'code')
    if (!code) throw new HttpError(400, 'Missing invite code.')

    const db = useDb()
    const [inviter] = await db.select().from(tables.users).where(eq(tables.users.inviteCode, code)).limit(1)
    if (!inviter) throw new HttpError(404, 'Invite link not found.')

    const isSelf = inviter.id === user.id

    let alreadyFriends = false
    if (!isSelf) {
      const [existing] = await db
        .select()
        .from(tables.friendships)
        .where(
          and(
            eq(tables.friendships.status, 'accepted'),
            or(
              and(eq(tables.friendships.requesterId, user.id), eq(tables.friendships.addresseeId, inviter.id)),
              and(eq(tables.friendships.requesterId, inviter.id), eq(tables.friendships.addresseeId, user.id))
            )
          )
        )
        .limit(1)
      alreadyFriends = !!existing
    }

    return {
      inviterId: inviter.id,
      displayName: inviter.displayName,
      avatarUrl: inviter.avatarUrl,
      isSelf,
      alreadyFriends
    }
  } catch (err) {
    throw toH3Error(err)
  }
})
