import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { HttpError, toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const body = await readBody<{ endpoint: string; keys: { p256dh: string; auth: string } }>(event)
    if (!body.endpoint || !body.keys) throw new HttpError(400, 'Invalid subscription.')

    const db = useDb()
    const [existing] = await db.select().from(tables.pushSubscriptions).where(eq(tables.pushSubscriptions.endpoint, body.endpoint)).limit(1)
    if (existing) return existing

    const [sub] = await db
      .insert(tables.pushSubscriptions)
      .values({ userId: user.id, endpoint: body.endpoint, keys: body.keys })
      .returning()

    return sub
  } catch (err) {
    throw toH3Error(err)
  }
})
