import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    // Fix XML content type for sitemaps in dev server
    {
      name: 'xml-content-type',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.xml')) {
            res.setHeader('Content-Type', 'text/xml')
          }
          next()
        })
      },
    },
    tanstackStart({
      tsr: {
        autoCodeSplitting: true,
        codeSplittingOptions: {
          defaultBehavior: [
            ['component'],
            ['pendingComponent'],
            ['errorComponent'],
            ['notFoundComponent'],
          ],
        },
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite's preload helper must not land in a heavy vendor chunk
          if (id.includes('vite/preload-helper') || id.includes('\0vite')) {
            return 'framework'
          }

          if (!id.includes('node_modules')) {
            return
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/use-sync-external-store/')
          ) {
            return 'react-vendor'
          }

          if (
            id.includes('/@tanstack/react-router/') ||
            id.includes('/@tanstack/router-core/') ||
            id.includes('/@tanstack/history/')
          ) {
            return 'router'
          }

          if (id.includes('/lucide-react/')) {
            return 'icons'
          }

          if (
            id.includes('/motion/') ||
            id.includes('/framer-motion/')
          ) {
            return 'motion'
          }

          if (id.includes('/recharts/')) {
            return 'react-vendor'
          }

          if (id.includes('/echarts-for-react/')) {
            return 'react-vendor'
          }

          if (id.includes('/echarts/')) {
            return 'echarts-core'
          }

          if (id.includes('/zrender/')) {
            return 'echarts-renderer'
          }

          if (id.includes('/react-i18next/')) {
            return 'react-vendor'
          }

          if (
            id.includes('/i18next/') ||
            id.includes('/i18next-http-backend/')
          ) {
            return 'i18n'
          }

          if (
            id.includes('/compromise/')
          ) {
            return 'nlp-compromise'
          }

          if (id.includes('/franc/')) {
            return 'nlp-franc'
          }

          if (id.includes('/sentiment/')) {
            return 'nlp-sentiment'
          }

          if (
            id.includes('/world-atlas/') ||
            id.includes('/topojson-client/') ||
            id.includes('/earcut/') ||
            id.includes('/polygon-clipping/')
          ) {
            return 'geo-vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 725,
  },
})
