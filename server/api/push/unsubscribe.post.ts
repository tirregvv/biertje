import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    await requireSessionUser(event)
    const body = await readBody<{ endpoint: string }>(event)
    const db = useDb()
    if (body.endpoint) {
      await db.delete(tables.pushSubscriptions).where(eq(tables.pushSubscriptions.endpoint, body.endpoint))
    }
    return { success: true }
  } catch (err) {
    throw toH3Error(err)
  }
})
