import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        id: '/',
        name: 'AgroLink',
        short_name: 'AgroLink',
        description:
          'AgroLink - connecting farmers, producers and buyers through a modern agricultural marketplace.',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
})