import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'

let configured = false

function ensureConfigured() {
  if (configured) return
  const config = useRuntimeConfig()
  webpush.setVapidDetails('mailto:hello@biert.app', config.vapidPublicKey as string, config.vapidPrivateKey as string)
  configured = true
}

export async function sendPushToUser(userId: string, payload: Record<string, unknown>) {
  ensureConfigured()
  const db = useDb()
  const subs = await db.select().from(tables.pushSubscriptions).where(eq(tables.pushSubscriptions.userId, userId))

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
          JSON.stringify(payload)
        )
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.delete(tables.pushSubscriptions).where(eq(tables.pushSubscriptions.id, sub.id))
        } else {
          console.error('Push send failed', err)
        }
      }
    })
  )
}
