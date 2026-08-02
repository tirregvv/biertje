import { requireSessionUser } from '~~/server/utils/session'
import { issueTicket } from '~~/server/utils/ws-tickets'
import { toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    return { ticket: issueTicket(user.id) }
  } catch (err) {
    throw toH3Error(err)
  }
})
