import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { HttpError, toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ email: string; password: string; displayName: string }>(event)
    const email = body.email?.trim().toLowerCase()
    const displayName = body.displayName?.trim()

    if (!email || !body.password || !displayName) {
      throw new HttpError(400, 'Email, password, and display name are required.')
    }
    if (body.password.length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters.')
    }

    const db = useDb()
    const existing = await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1)
    if (existing.length > 0) {
      throw new HttpError(409, 'An account with this email already exists.')
    }

    const passwordHash = await hashPassword(body.password)
    const [user] = await db
      .insert(tables.users)
      .values({ email, passwordHash, displayName })
      .returning()

    await db.insert(tables.notificationPrefs).values({ userId: user.id })

    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        defaultSessionMinutes: user.defaultSessionMinutes
      }
    })

    return { id: user.id, email: user.email, displayName: user.displayName }
  } catch (err) {
    throw toH3Error(err)
  }
})
