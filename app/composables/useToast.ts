export type Toast = {
  id: string
  title: string
  body?: string
  type?: string
}

const toasts = ref<Toast[]>([])

export function useToast() {
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
