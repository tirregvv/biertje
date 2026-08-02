import { and, desc, eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { requireSessionUser } from '~~/server/utils/session'
import { toH3Error } from '~~/server/utils/errors'

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const db = useDb()

    const [row] = await db
      .select({
        dailyChallengeId: tables.dailyChallenges.id,
        date: tables.dailyChallenges.date,
        text: tables.challenges.text,
        category: tables.challenges.category,
        difficulty: tables.challenges.difficulty
      })
      .from(tables.dailyChallenges)
      .innerJoin(tables.challenges, eq(tables.challenges.id, tables.dailyChallenges.challengeId))
      .where(eq(tables.dailyChallenges.date, todayUtcDateString()))
      .limit(1)

    if (!row) return { challenge: null, completed: false, streak: 0 }

    const [completion] = await db
      .select()
      .from(tables.challengeCompletions)
      .where(and(eq(tables.challengeCompletions.dailyChallengeId, row.dailyChallengeId), eq(tables.challengeCompletions.userId, user.id)))
      .limit(1)

    const recentCompletions = await db
      .select({ date: tables.dailyChallenges.date })
      .from(tables.challengeCompletions)
      .innerJoin(tables.dailyChallenges, eq(tables.dailyChallenges.id, tables.challengeCompletions.dailyChallengeId))
      .where(eq(tables.challengeCompletions.userId, user.id))
      .orderBy(desc(tables.dailyChallenges.date))

    let streak = 0
    const cursor = new Date(todayUtcDateString() + 'T00:00:00Z')
    const completedDates = new Set(recentCompletions.map((r) => r.date))
    if (completion) {
      while (completedDates.has(cursor.toISOString().slice(0, 10))) {
        streak++
        cursor.setUTCDate(cursor.getUTCDate() - 1)
      }
    }

    return { challenge: row, completed: !!completion, streak }
  } catch (err) {
    throw toH3Error(err)
  }
})
