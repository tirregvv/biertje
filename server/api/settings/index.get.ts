import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const db = useDb()
    const [prefs] = await db.select().from(tables.notificationPrefs).where(eq(tables.notificationPrefs.userId, user.id)).limit(1)
    return {
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      defaultSessionMinutes: user.defaultSessionMinutes,
      notificationPrefs: prefs ?? {
        friendRequest: true,
        friendSessionStarted: true,
        reaction: true,
        dailyChallenge: true
      }
    }
  } catch (err) {
    throw toH3Error(err)
  }
})
