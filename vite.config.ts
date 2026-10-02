import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { host: true, port: 5174 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'charts'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'mask-icon.svg', 'robots.txt'],
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'Heavy Duty Workout Tracker',
        short_name: 'Heavy Duty',
        description: 'Track Mike Mentzer-inspired HIT workouts, progressive overload, and recovery on your phone.',
        theme_color: '#0B0B0C',
        background_color: '#0B0B0C',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'browser'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Start Open Workout',
            short_name: 'Open Workout',
            description: 'Jump straight into a freeform workout.',
            url: '/workout/open',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'View Progress',
            short_name: 'Progress',
            description: 'Open charts, PRs, and workout trends.',
            url: '/progress',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Workout History',
            short_name: 'History',
            description: 'Review past workouts and edit sessions.',
            url: '/history',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Precache only the Latin font subset; other subsets load on demand via unicode-range.
        globPatterns: ['**/*.{js,css,html}', '**/geist-latin-wght-normal-*.woff2'],
      },
    }),
  ],
})
