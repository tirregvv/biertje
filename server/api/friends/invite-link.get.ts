import { requireSessionUser } from '~~/server/utils/session'
import { getOrCreateInviteCode } from '~~/server/utils/invite'
import { toH3Error } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const code = await getOrCreateInviteCode(user.id)
    return { code }
  } catch (err) {
    throw toH3Error(err)
  }
})
