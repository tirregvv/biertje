import { and, eq, isNull } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { getFriendIds } from '~~/server/utils/friends'
import { broadcastToUsers } from '~~/server/utils/ws-hub'
import { notify } from '~~/server/utils/notify'
import { reverseGeocode } from '~~/server/utils/geocode'
import { DRINK_LABELS } from '~~/server/utils/drinks'
import { HttpError, toH3Error } from '~~/server/utils/errors'

const DRINK_TYPES = ['beer', 'wine', 'cocktail', 'shot', 'cider', 'non_alcoholic'] as const

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const body = await readBody<{
      lat?: number
      lng?: number
      drinkType: (typeof DRINK_TYPES)[number]
      note?: string
      minutes?: number
    }>(event)

    if (!DRINK_TYPES.includes(body.drinkType)) {
      throw new HttpError(400, 'Invalid drink type.')
    }

    const hasLocation = typeof body.lat === 'number' && typeof body.lng === 'number'

    const minutes = body.minutes && body.minutes > 0 ? Math.min(body.minutes, 240) : user.defaultSessionMinutes
    const db = useDb()

    // Only one active session per user at a time — end any existing one.
    await db
      .update(tables.beerSessions)
      .set({ endedEarlyAt: new Date() })
      .where(and(eq(tables.beerSessions.userId, user.id), isNull(tables.beerSessions.endedEarlyAt)))

    const expiresAt = new Date(Date.now() + minutes * 60_000)
    const [session] = await db
      .insert(tables.beerSessions)
      .values({
        userId: user.id,
        lat: hasLocation ? body.lat : null,
        lng: hasLocation ? body.lng : null,
        drinkType: body.drinkType,
        note: body.note?.slice(0, 280),
        expiresAt
      })
      .returning()

    const friendIds = await getFriendIds(user.id)
    broadcastToUsers(friendIds, {
      type: 'session:new',
      session: { ...session, displayName: user.displayName, avatarUrl: user.avatarUrl, address: null }
    })

    // Reverse geocoding is a slow external call — don't make the beer-button tap wait on it.
    // Friends' pins already appear instantly; the address just enriches the notification/info card shortly after.
    ;(async () => {
      const address = hasLocation ? await reverseGeocode(body.lat!, body.lng!) : null
      if (address) {
        await db.update(tables.beerSessions).set({ address }).where(eq(tables.beerSessions.id, session.id))
      }

      const drinkLabel = DRINK_LABELS[body.drinkType] ?? 'a drink'
      const message = !hasLocation
        ? `${user.displayName} is having ${drinkLabel} at an unknown location`
        : address
          ? `${user.displayName} is having ${drinkLabel} at ${address}`
          : `${user.displayName} is having ${drinkLabel}`

      if (hasLocation) broadcastToUsers(friendIds, { type: 'session:address', sessionId: session.id, address })
      await Promise.all(
        friendIds.map((friendId) =>
          notify(friendId, 'friend_session_started', {
            fromUserId: user.id,
            title: `${user.displayName} is out`,
            message
          })
        )
      )
    })().catch((err) => console.error('beer-sessions: background notify failed', err))

    return session
  } catch (err) {
    throw toH3Error(err)
  }
})
