import { and, eq, or } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { HttpError, toH3Error } from '~~/server/utils/errors'
import { notify } from '~~/server/utils/notify'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const body = await readBody<{ email: string }>(event)
    const email = body.email?.trim().toLowerCase()
    if (!email) throw new HttpError(400, 'Email is required.')
    if (email === user.email) throw new HttpError(400, "You can't friend yourself.")

    const db = useDb()
    const [target] = await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1)
    if (!target) throw new HttpError(404, 'No user found with that email.')

    const existing = await db
      .select()
      .from(tables.friendships)
      .where(
        or(
          and(eq(tables.friendships.requesterId, user.id), eq(tables.friendships.addresseeId, target.id)),
          and(eq(tables.friendships.requesterId, target.id), eq(tables.friendships.addresseeId, user.id))
        )
      )
      .limit(1)

    if (existing.length > 0) {
      throw new HttpError(409, 'A friendship or request already exists with this user.')
    }

    const [friendship] = await db
      .insert(tables.friendships)
      .values({ requesterId: user.id, addresseeId: target.id, status: 'pending' })
      .returning()

    await notify(target.id, 'friend_request', {
      fromUserId: user.id,
      fromDisplayName: user.displayName,
      message: `${user.displayName} wants to be friends`
    })

    return friendship
  } catch (err) {
    throw toH3Error(err)
  }
})
