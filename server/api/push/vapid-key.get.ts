export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return { publicKey: config.vapidPublicKey }
})
