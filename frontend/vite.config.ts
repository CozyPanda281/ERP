import { defineConfig } from 'vitest/config'
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
        name: 'School ERP',
        short_name: 'ERP',
        description: 'School management platform',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
