import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'

export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile']
  },
  async onSuccess(event, { user: googleUser }) {
    try {
      const db = useDb()
      const email = googleUser.email?.trim().toLowerCase()
      if (!email) {
        return sendRedirect(event, '/login?error=google_no_email')
      }

      let [user] = await db.select().from(tables.users).where(eq(tables.users.googleId, googleUser.sub)).limit(1)

      if (!user) {
        const [byEmail] = await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1)
        if (byEmail) {
          ;[user] = await db
            .update(tables.users)
            .set({ googleId: googleUser.sub, avatarUrl: byEmail.avatarUrl ?? googleUser.picture ?? null })
            .where(eq(tables.users.id, byEmail.id))
            .returning()
        } else {
          ;[user] = await db
            .insert(tables.users)
            .values({
              email,
              googleId: googleUser.sub,
              displayName: googleUser.name || email.split('@')[0],
              avatarUrl: googleUser.picture ?? null
            })
            .returning()
          await db.insert(tables.notificationPrefs).values({ userId: user.id })
        }
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

      return sendRedirect(event, '/')
    } catch (err) {
      console.error('Google OAuth onSuccess failed', err)
      return sendRedirect(event, '/login?error=google_auth_failed')
    }
  },
  onError(event) {
    return sendRedirect(event, '/login?error=google_auth_failed')
  }
})
