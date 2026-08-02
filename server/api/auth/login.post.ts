import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { HttpError, toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ email: string; password: string }>(event)
    const email = body.email?.trim().toLowerCase()
    if (!email || !body.password) {
      throw new HttpError(400, 'Email and password are required.')
    }

    const db = useDb()
    const [user] = await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1)
    if (!user || !user.passwordHash) {
      throw new HttpError(401, 'Invalid email or password.')
    }

    const valid = await verifyPassword(user.passwordHash, body.password)
    if (!valid) {
      throw new HttpError(401, 'Invalid email or password.')
    }

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
