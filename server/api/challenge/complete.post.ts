import { and, eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { HttpError, toH3Error } from '~~/server/utils/errors'

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const body = await readBody<{ proofNote?: string }>(event).catch(() => ({}))
    const db = useDb()

    const [daily] = await db
      .select()
      .from(tables.dailyChallenges)
      .where(eq(tables.dailyChallenges.date, todayUtcDateString()))
      .limit(1)
    if (!daily) throw new HttpError(404, "Today's challenge has not been picked yet.")

    const [existing] = await db
      .select()
      .from(tables.challengeCompletions)
      .where(and(eq(tables.challengeCompletions.dailyChallengeId, daily.id), eq(tables.challengeCompletions.userId, user.id)))
      .limit(1)
    if (existing) return existing

    const [completion] = await db
      .insert(tables.challengeCompletions)
      .values({ dailyChallengeId: daily.id, userId: user.id, proofNote: body?.proofNote?.slice(0, 280) })
      .returning()

    return completion
  } catch (err) {
    throw toH3Error(err)
  }
})
