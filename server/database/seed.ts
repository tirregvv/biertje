import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { challenges } from './schema'
import { seedChallenges } from './seed-data/challenges'

const databaseUrl = process.env.DATABASE_URL || 'postgres:///biert'
const client = postgres(databaseUrl, { max: 1 })
const db = drizzle(client)

const existing = await db.select({ text: challenges.text }).from(challenges)
const existingTexts = new Set(existing.map((c) => c.text))
const toInsert = seedChallenges.filter((c) => !existingTexts.has(c.text))

if (toInsert.length > 0) {
  await db.insert(challenges).values(toInsert)
}

console.log(`Seeded ${toInsert.length} new challenges (${seedChallenges.length} total in pool, ${existingTexts.size} already present).`)
await client.end()
