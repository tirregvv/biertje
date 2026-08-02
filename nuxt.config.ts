// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', 'nuxt-auth-utils', '@vueuse/motion/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: {
    optimizeDeps: {
      exclude: ['maplibre-gl']
    }
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    oauth: {
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET
      }
    },
    public: {
      maptilerKey: process.env.MAPTILER_KEY
    }
  },
  nitro: {
    experimental: {
      websocket: true,
      tasks: true
    },
    scheduledTasks: {
      '*/5 * * * *': ['daily-challenge-pick']
    }
  }
})
