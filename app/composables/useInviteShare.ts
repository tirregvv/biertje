export function useInviteShare() {
  const sharing = ref(false)
  const copied = ref(false)

  async function share() {
    sharing.value = true
    try {
      const { code } = await $fetch('/api/friends/invite-link')
      const url = `${window.location.origin}/invite/${code}`

      if (navigator.share) {
        await navigator.share({ title: 'Join me on Beer With Me', url })
        return
      }

      await navigator.clipboard.writeText(url)
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    } catch (err: any) {
      // The user cancelling the native share sheet isn't an error worth surfacing.
      if (err?.name !== 'AbortError') throw err
    } finally {
      sharing.value = false
    }
  }

  return { share, sharing, copied }
}
