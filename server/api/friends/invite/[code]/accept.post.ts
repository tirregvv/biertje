import { and, eq, or } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { HttpError, toH3Error } from '~~/server/utils/errors'
import { notify } from '~~/server/utils/notify'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const code = getRouterParam(event, 'code')
    if (!code) throw new HttpError(400, 'Missing invite code.')

    const db = useDb()
    const [inviter] = await db.select().from(tables.users).where(eq(tables.users.inviteCode, code)).limit(1)
    if (!inviter) throw new HttpError(404, 'Invite link not found.')
    if (inviter.id === user.id) throw new HttpError(400, "You can't add yourself as a friend.")

    const [existing] = await db
      .select()
      .from(tables.friendships)
      .where(
        or(
          and(eq(tables.friendships.requesterId, user.id), eq(tables.friendships.addresseeId, inviter.id)),
          and(eq(tables.friendships.requesterId, inviter.id), eq(tables.friendships.addresseeId, user.id))
        )
      )
      .limit(1)

    if (existing) {
      if (existing.status === 'accepted') return existing
      const [updated] = await db
        .update(tables.friendships)
        .set({ status: 'accepted', respondedAt: new Date() })
        .where(eq(tables.friendships.id, existing.id))
        .returning()
      await notify(inviter.id, 'friend_accepted', {
        fromUserId: user.id,
        fromDisplayName: user.displayName,
        message: `${user.displayName} accepted your friend request`
      })
      return updated
    }

    // The inviter already consented by sharing the link, so this goes straight to "accepted".
    const [friendship] = await db
      .insert(tables.friendships)
      .values({ requesterId: inviter.id, addresseeId: user.id, status: 'accepted', respondedAt: new Date() })
      .returning()

    await notify(inviter.id, 'friend_accepted', {
      fromUserId: user.id,
      fromDisplayName: user.displayName,
      message: `${user.displayName} added you as a friend`
    })

    return friendship
  } catch (err) {
    throw toH3Error(err)
  }
})
