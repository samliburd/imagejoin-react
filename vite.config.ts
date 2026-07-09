import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
      registerType: 'autoUpdate',
      manifest: {
          name: 'ImageJoin',
          short_name: 'ImageJoin',
          description: 'Tool to join two or more images using the Canvas API',
          theme_color: '#2f3b45',
          icons: [{
              "src": "pwa-64x64.png",
              "sizes": "64x64",
              "type": "image/png"
          },
              {
                  "src": "pwa-192x192.png",
                  "sizes": "192x192",
                  "type": "image/png"
              },
              {
                  "src": "pwa-512x512.png",
                  "sizes": "512x512",
                  "type": "image/png"
              },
              {
                  "src": "maskable-icon-512x512.png",
                  "sizes": "512x512",
                  "type": "image/png",
                  "purpose": "maskable"
              }]
      }
  })],
})
