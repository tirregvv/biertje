export function useSessionsSocket() {
  const store = useBeerSessionsStore()
  const { push: pushToast } = useToast()
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function sendVisibility() {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'visibility', visible: !document.hidden }))
    }
  }

  async function connect() {
    const { ticket } = await $fetch('/api/ws-ticket', { method: 'POST' })
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    socket = new WebSocket(`${protocol}://${location.host}/ws/sessions?ticket=${ticket}`)

    socket.addEventListener('open', () => {
      sendVisibility()
      document.addEventListener('visibilitychange', sendVisibility)
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
      reconnectTimer = setTimeout(connect, 2000)
    })
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    document.removeEventListener('visibilitychange', sendVisibility)
    socket?.close()
    socket = null
  }

  return { connect, disconnect }
}
