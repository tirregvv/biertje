import { consumeTicket } from '~~/server/utils/ws-tickets'
import { registerPeer, unregisterPeer, setPeerVisibility } from '~~/server/utils/ws-hub'

export default defineWebSocketHandler({
  open(peer) {
    const url = new URL(peer.request.url, 'http://localhost')
    const ticket = url.searchParams.get('ticket') ?? ''
    const userId = consumeTicket(ticket)

    if (!userId) {
      peer.close(4401, 'Invalid or expired ticket')
      return
    }

    peer.context.userId = userId
    registerPeer(userId, peer)
  },
  message(peer, message) {
    try {
      const data = message.json<{ type: string; visible?: boolean }>()
      if (data.type === 'visibility' && typeof data.visible === 'boolean') {
        setPeerVisibility(peer, data.visible)
      }
    } catch {
      // Ignore malformed client messages.
    }
  },
  close(peer) {
    const userId = peer.context.userId as string | undefined
    if (userId) unregisterPeer(userId, peer)
  }
})
