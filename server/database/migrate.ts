import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL || 'postgres:///biert'
const client = postgres(databaseUrl, { max: 1 })
const db = drizzle(client)

await migrate(db, { migrationsFolder: './server/database/migrations' })
console.log('Migrations applied.')
await client.end()
