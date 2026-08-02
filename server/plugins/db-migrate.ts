import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { challenges } from '~~/server/database/schema'
import { seedChallenges } from '~~/server/database/seed-data/challenges'
import { getDbConnectionOptions } from '~~/server/database/connection'

export default defineNitroPlugin(async () => {
  const client = postgres(getDbConnectionOptions({ max: 1 }))
  const db = drizzle(client)

  await migrate(db, { migrationsFolder: './server/database/migrations' })

  const existing = await db.select({ text: challenges.text }).from(challenges)
  const existingTexts = new Set(existing.map((c) => c.text))
  const toInsert = seedChallenges.filter((c) => !existingTexts.has(c.text))
  if (toInsert.length > 0) {
    await db.insert(challenges).values(toInsert)
  }

  await client.end()
  console.log(`[startup] Migrations applied. Seeded ${toInsert.length} new challenge(s).`)
})
