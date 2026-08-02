import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined

export function useDb() {
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL || 'postgres:///biert')
    _db = drizzle(client, { schema })
  }
  return _db
}

export * as tables from './schema'
