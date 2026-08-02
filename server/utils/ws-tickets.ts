const tickets = new Map<string, { userId: string; expiresAt: number }>()
const TICKET_TTL_MS = 30_000

export function issueTicket(userId: string): string {
  const ticket = crypto.randomUUID()
  tickets.set(ticket, { userId, expiresAt: Date.now() + TICKET_TTL_MS })
  return ticket
}

export function consumeTicket(ticket: string): string | null {
  const entry = tickets.get(ticket)
  if (!entry) return null
  tickets.delete(ticket)
  if (entry.expiresAt < Date.now()) return null
  return entry.userId
}
