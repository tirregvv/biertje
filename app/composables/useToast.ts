export type Toast = {
  id: string
  title: string
  body?: string
  type?: string
}

export function useToast() {
  // useState (not a bare module-level ref) — a `const x = ref()` at module scope is shared across
  // server requests, which is exactly what Nuxt's state-management guidance says to avoid.
  const toasts = useState<Toast[]>('toasts', () => [])

  function push(toast: Omit<Toast, 'id'>, durationMs = 4500) {
    const id = crypto.randomUUID()
    toasts.value.push({ id, ...toast })
    setTimeout(() => dismiss(id), durationMs)
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, push, dismiss }
}
