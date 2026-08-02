import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Minimal `.env` loader for production.
 *
 * Nitro does NOT read a `.env` file in production (only Nuxt dev does), but many
 * self-hosted deploy tools (Cleavr, etc.) drop configuration into a `.env` file
 * rather than injecting real process environment variables. This loads that
 * file at startup so the app never depends on the platform injecting a real
 * environment.
 *
 * Real environment variables always win — a `.env` value never overrides a
 * variable that is already set in `process.env`.
 *
 * Memoized: the file is read at most once.
 *
 * Returns the number of variables applied on the first (real) load.
 */
let memo: number | null = null

export function loadDotEnv(): number {
  if (memo !== null) return memo

  const file = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.output/.env'),
  ].find((p) => existsSync(p))
  if (!file) return (memo = 0)

  let applied = 0
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice('export '.length).trim()

    const eq = line.indexOf('=')
    if (eq <= 0) continue

    const key = line.slice(0, eq).trim()
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue // real env wins

    let value = line.slice(eq + 1).trim()
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
    applied++
  }
  return (memo = applied)
}
