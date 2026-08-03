export function useSessionsSocket() {
  const store = useBeerSessionsStore()
  const { push: pushToast } = useToast()
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let retryDelay = 2000
  let stopped = true // flips to false once connect() is first called (i.e. once logged in)

  function sendVisibility() {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'visibility', visible: !document.hidden }))
    }
  }

  function scheduleReconnect() {
    if (stopped) return
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(connect, retryDelay)
    retryDelay = Math.min(retryDelay * 2, 15000)
  }

  // Always attached for the whole login session (not just while a socket happens to be open) —
  // the gap we need to close is precisely the window where the socket is down, so a listener
  // scoped to the socket's own open/close (like sendVisibility below) would miss it.
  function onResume() {
    if (stopped) return // logged out — nothing to reconcile or reconnect
    store.reconcile()
    if (!socket || (socket.readyState !== WebSocket.OPEN && socket.readyState !== WebSocket.CONNECTING)) {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      retryDelay = 2000
      connect()
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') onResume()
  }

  async function connect() {
    stopped = false
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return

    try {
      const { ticket } = await $fetch('/api/ws-ticket', { method: 'POST' })
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
      socket = new WebSocket(`${protocol}://${location.host}/ws/sessions?ticket=${ticket}`)

      socket.addEventListener('open', () => {
        retryDelay = 2000
        sendVisibility()
        document.addEventListener('visibilitychange', sendVisibility)
        // A reconnect might be closing a gap where broadcasts were missed — reconcile
        // unconditionally (force, bypassing the throttle) rather than assume this is the
        // first-ever connect.
        store.reconcile({ maxAgeMs: 0 })
      })

      socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'session:new') store.upsert(data.session)
        if (data.type === 'session:ended') store.remove(data.sessionId)
        if (data.type === 'session:address') store.updateAddress(data.sessionId, data.address)
        if (data.type === 'notification') {
          pushToast({ title: data.notification.title, body: data.notification.body, type: data.notification.type })
        }
      })

      socket.addEventListener('close', () => {
        document.removeEventListener('visibilitychange', sendVisibility)
        scheduleReconnect()
      })
    } catch {
      scheduleReconnect()
    }
  }

  function disconnect() {
    stopped = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    document.removeEventListener('visibilitychange', sendVisibility)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pageshow', onResume)
    window.removeEventListener('online', onResume)
    socket?.close()
    socket = null
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pageshow', onResume)
  window.addEventListener('online', onResume)

  return { connect, disconnect }
}
