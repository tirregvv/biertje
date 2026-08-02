import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const db = useDb()

    const accepted = await db
      .select()
      .from(tables.friendships)
      .where(
        and(
          eq(tables.friendships.status, 'accepted'),
          or(eq(tables.friendships.requesterId, user.id), eq(tables.friendships.addresseeId, user.id))
        )
      )

    const friendIds = accepted.map((f) => (f.requesterId === user.id ? f.addresseeId : f.requesterId))

    const friends =
      friendIds.length === 0
        ? []
        : await db.query.users.findMany({
            where: (u, { inArray }) => inArray(u.id, friendIds),
            columns: { id: true, displayName: true, avatarUrl: true, email: true }
          })

    // One most-recent session per friend, for the home feed's activity ordering and the
    // friend detail view — avoids a separate round-trip per friend.
    const recentSessions =
      friendIds.length === 0
        ? []
        : await db
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
              endedEarlyAt: tables.beerSessions.endedEarlyAt
            })
            .from(tables.beerSessions)
            .where(inArray(tables.beerSessions.userId, friendIds))
            .orderBy(desc(tables.beerSessions.startedAt))
            .limit(300)

    const lastSessionByFriendId = new Map<string, (typeof recentSessions)[number]>()
    for (const session of recentSessions) {
      if (!lastSessionByFriendId.has(session.userId)) lastSessionByFriendId.set(session.userId, session)
    }

    const friendsWithLastSession = friends.map((friend) => ({
      ...friend,
      lastSession: lastSessionByFriendId.get(friend.id) ?? null
    }))

    const requesterUsers = alias(tables.users, 'requester_users')
    const addresseeUsers = alias(tables.users, 'addressee_users')

    const incoming = await db
      .select({
        id: tables.friendships.id,
        requesterId: tables.friendships.requesterId,
        addresseeId: tables.friendships.addresseeId,
        status: tables.friendships.status,
        createdAt: tables.friendships.createdAt,
        requesterDisplayName: requesterUsers.displayName,
        requesterAvatarUrl: requesterUsers.avatarUrl
      })
      .from(tables.friendships)
      .innerJoin(requesterUsers, eq(requesterUsers.id, tables.friendships.requesterId))
      .where(and(eq(tables.friendships.status, 'pending'), eq(tables.friendships.addresseeId, user.id)))

    const outgoing = await db
      .select({
        id: tables.friendships.id,
        requesterId: tables.friendships.requesterId,
        addresseeId: tables.friendships.addresseeId,
        status: tables.friendships.status,
        createdAt: tables.friendships.createdAt,
        addresseeDisplayName: addresseeUsers.displayName,
        addresseeAvatarUrl: addresseeUsers.avatarUrl
      })
      .from(tables.friendships)
      .innerJoin(addresseeUsers, eq(addresseeUsers.id, tables.friendships.addresseeId))
      .where(and(eq(tables.friendships.status, 'pending'), eq(tables.friendships.requesterId, user.id)))

    return { friends: friendsWithLastSession, incomingRequests: incoming, outgoingRequests: outgoing }
  } catch (err) {
    throw toH3Error(err)
  }
})
