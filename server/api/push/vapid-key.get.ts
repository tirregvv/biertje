export default defineEventHandler(() => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY || '' }
})
