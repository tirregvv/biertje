import { eq } from 'drizzle-orm'
import { useDb, tables } from '~~/server/database/client'

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = useDb()
  const [row] = await db.select().from(tables.appSettings).where(eq(tables.appSettings.key, key)).limit(1)
  return row ? (row.value as T) : fallback
}

export async function setSetting(key: string, value: unknown) {
  const db = useDb()
  await db
    .insert(tables.appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: tables.appSettings.key, set: { value } })
}
