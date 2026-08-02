// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', 'nuxt-auth-utils', '@vueuse/motion/nuxt'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      // Without a manifest + these Apple-specific tags, "Add to Home Screen" produces a plain
      // Safari bookmark rather than a standalone app — and iOS only exposes the Push API
      // (`PushManager` in window) to a standalone-launched PWA, so push silently can't work
      // until this is in place.
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ],
      meta: [
        { name: 'theme-color', content: '#fbbf24' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Biert' }
      ]
    }
  },
  vite: {
    optimizeDeps: {
      exclude: ['maplibre-gl']
    }
  },
  runtimeConfig: {
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
