import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { HttpError, toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const body = await readBody<{ displayName?: string; defaultSessionMinutes?: number }>(event)
    const db = useDb()

    const updates: Record<string, unknown> = {}
    if (body.displayName) updates.displayName = body.displayName.trim().slice(0, 60)
    if (body.defaultSessionMinutes) {
      if (body.defaultSessionMinutes < 5 || body.defaultSessionMinutes > 240) {
        throw new HttpError(400, 'Session duration must be between 5 and 240 minutes.')
      }
      updates.defaultSessionMinutes = body.defaultSessionMinutes
    }
    if (Object.keys(updates).length === 0) throw new HttpError(400, 'No changes provided.')

    const [updated] = await db
      .update(tables.users)
      .set(updates)
      .where(eq(tables.users.id, user.id))
      .returning({
        id: tables.users.id,
        email: tables.users.email,
        displayName: tables.users.displayName,
        avatarUrl: tables.users.avatarUrl,
        defaultSessionMinutes: tables.users.defaultSessionMinutes
      })

    await setUserSession(event, { user: updated })

    return updated
  } catch (err) {
    throw toH3Error(err)
  }
})
