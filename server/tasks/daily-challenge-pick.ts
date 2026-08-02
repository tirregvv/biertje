import { and, eq, gte, notInArray } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'
import { getSetting } from '~~/server/utils/app-settings'
import { notify } from '~~/server/utils/notify'

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function currentUtcMinutes(): number {
  const now = new Date()
  return now.getUTCHours() * 60 + now.getUTCMinutes()
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export default defineTask({
  meta: {
    name: 'daily-challenge-pick',
    description: 'Once per day, at the configured global time, pick a random challenge for the day.'
  },
  async run() {
    const db = useDb()
    const today = todayUtcDateString()

    const [existing] = await db.select().from(tables.dailyChallenges).where(eq(tables.dailyChallenges.date, today)).limit(1)
    if (existing) return { result: 'already-picked' }

    const configuredTime = await getSetting('daily_challenge_time_utc', '12:00')
    if (currentUtcMinutes() < parseTimeToMinutes(configuredTime)) {
      return { result: 'too-early' }
    }

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentlyUsed = await db
      .select({ challengeId: tables.dailyChallenges.challengeId })
      .from(tables.dailyChallenges)
      .where(gte(tables.dailyChallenges.selectedAt, cutoff))
    const recentIds = recentlyUsed.map((r) => r.challengeId)

    const eligible = await db
      .select()
      .from(tables.challenges)
      .where(
        recentIds.length > 0
          ? and(eq(tables.challenges.isActive, true), notInArray(tables.challenges.id, recentIds))
          : eq(tables.challenges.isActive, true)
      )

    const pool = eligible.length > 0 ? eligible : await db.select().from(tables.challenges).where(eq(tables.challenges.isActive, true))
    if (pool.length === 0) return { result: 'no-challenges-available' }

    const chosen = pool[Math.floor(Math.random() * pool.length)]

    const [daily] = await db.insert(tables.dailyChallenges).values({ date: today, challengeId: chosen.id }).returning()

    const users = await db.select({ id: tables.users.id }).from(tables.users)
    await Promise.all(
      users.map((u) => notify(u.id, 'daily_challenge', { challengeId: chosen.id, message: chosen.text }))
    )

    return { result: 'picked', dailyChallengeId: daily.id, challengeId: chosen.id }
  }
})
