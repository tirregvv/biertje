import { loadDotEnv } from '../utils/load-env'

/**
 * Load a `.env` file into `process.env` at startup.
 *
 * Runs first (filename order, before db-migrate.ts) so the DB connection
 * options (`server/database/connection.ts` reads `process.env` directly) see
 * the real values regardless of whether the platform injected real
 * environment variables or only wrote a `.env` file (see utils/load-env.ts).
 */
export default defineNitroPlugin(() => {
  const applied = loadDotEnv()
  if (applied > 0) console.log(`[env] loaded ${applied} variable(s) from .env`)
})
