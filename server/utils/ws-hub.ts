import type { Peer } from 'crossws'

const peersByUser = new Map<string, Set<Peer>>()
const peerVisibility = new WeakMap<Peer, boolean>()

export function registerPeer(userId: string, peer: Peer) {
  if (!peersByUser.has(userId)) peersByUser.set(userId, new Set())
  peersByUser.get(userId)!.add(peer)
  peerVisibility.set(peer, true)
}

export function unregisterPeer(userId: string, peer: Peer) {
  const set = peersByUser.get(userId)
  if (!set) return
  set.delete(peer)
  peerVisibility.delete(peer)
  if (set.size === 0) peersByUser.delete(userId)
}

export function setPeerVisibility(peer: Peer, visible: boolean) {
  peerVisibility.set(peer, visible)
}

export function broadcastToUsers(userIds: string[], payload: Record<string, unknown>) {
  const message = JSON.stringify(payload)
  for (const userId of userIds) {
    const set = peersByUser.get(userId)
    if (!set) continue
    for (const peer of set) peer.send(message)
  }
}

export function hasActivePeer(userId: string): boolean {
  const set = peersByUser.get(userId)
  return !!set && set.size > 0
}

/** True if any of the user's connected tabs currently report themselves as visible (foreground). */
export function hasVisiblePeer(userId: string): boolean {
  const set = peersByUser.get(userId)
  if (!set) return false
  for (const peer of set) {
    if (peerVisibility.get(peer)) return true
  }
  return false
}
