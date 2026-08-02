function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushSubscription() {
  const supported = computed(() => import.meta.client && 'serviceWorker' in navigator && 'PushManager' in window)

  async function subscribe() {
    if (!supported.value) return false
    const registration = await navigator.serviceWorker.register('/sw.js')
    const { publicKey } = await $fetch('/api/push/vapid-key')
    if (!publicKey) return false

    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      }))

    await $fetch('/api/push/subscribe', { method: 'POST', body: subscription.toJSON() })
    return true
  }

  async function unsubscribe() {
    if (!supported.value) return
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) {
      await $fetch('/api/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } })
      await subscription.unsubscribe()
    }
  }

  return { supported, subscribe, unsubscribe }
}
