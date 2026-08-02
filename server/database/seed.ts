import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { challenges } from './schema'
import { seedChallenges } from './seed-data/challenges'
import { getDbConnectionOptions } from './connection'

const client = postgres(getDbConnectionOptions({ max: 1 }))
const db = drizzle(client)

const existing = await db.select({ text: challenges.text }).from(challenges)
const existingTexts = new Set(existing.map((c) => c.text))
const toInsert = seedChallenges.filter((c) => !existingTexts.has(c.text))

if (toInsert.length > 0) {
  await db.insert(challenges).values(toInsert)
}

console.log(`Seeded ${toInsert.length} new challenges (${seedChallenges.length} total in pool, ${existingTexts.size} already present).`)
await client.end()
