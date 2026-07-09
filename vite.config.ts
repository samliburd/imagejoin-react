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
      }
  })],
})
