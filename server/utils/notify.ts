import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { sendPushToUser } from '~~/server/utils/push'
import { broadcastToUsers, hasVisiblePeer } from '~~/server/utils/ws-hub'

export type NotificationType = 'friend_request' | 'friend_accepted' | 'friend_session_started' | 'reaction' | 'daily_challenge'

const prefKeyByType: Record<NotificationType, keyof typeof tables.notificationPrefs.$inferSelect | null> = {
  friend_request: 'friendRequest',
  friend_accepted: 'friendRequest',
  friend_session_started: 'friendSessionStarted',
  reaction: 'reaction',
  daily_challenge: 'dailyChallenge'
}

const titleByType: Record<NotificationType, string> = {
  friend_request: 'New friend request',
  friend_accepted: 'Friend request accepted',
  friend_session_started: 'A friend is having a drink',
  reaction: 'Someone reacted to your session',
  daily_challenge: "Today's challenge is here"
}

/**
 * Fan-out hub: writes an in-app notification row and best-effort pushes.
 * Never throws into the caller's request path.
 */
export async function notify(userId: string, type: NotificationType, payload: Record<string, unknown> = {}) {
  try {
    const db = useDb()

    const [prefs] = await db.select().from(tables.notificationPrefs).where(eq(tables.notificationPrefs.userId, userId)).limit(1)
    const prefKey = prefKeyByType[type]
    if (prefs && prefKey && prefs[prefKey] === false) return

    await db.insert(tables.notifications).values({ userId, type, payload })

    const title = typeof payload.title === 'string' ? payload.title : titleByType[type]
    const body = typeof payload.message === 'string' ? payload.message : ''

    // Only skip the push in favor of a toast if a connected tab is actually in the foreground.
    if (hasVisiblePeer(userId)) {
      broadcastToUsers([userId], { type: 'notification', notification: { type, title, body, payload, createdAt: new Date().toISOString() } })
    } else {
      sendPushToUser(userId, { title, body, type, payload }).catch((err) => {
        console.error('notify: push delivery failed', err)
      })
    }
  } catch (err) {
    console.error('notify: failed to dispatch notification', err)
  }
}
