import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const body = await readBody<Partial<Record<'friendRequest' | 'friendSessionStarted' | 'reaction' | 'dailyChallenge', boolean>>>(event)
    const db = useDb()

    await db
      .insert(tables.notificationPrefs)
      .values({ userId: user.id, ...body })
      .onConflictDoUpdate({ target: tables.notificationPrefs.userId, set: body })

    return { success: true }
  } catch (err) {
    throw toH3Error(err)
  }
})
