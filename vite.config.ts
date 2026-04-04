import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
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
    TanStackRouterVite({
      autoCodeSplitting: true,
      codeSplittingOptions: {
        defaultBehavior: [
          ['component'],
          ['pendingComponent'],
          ['errorComponent'],
          ['notFoundComponent'],
        ],
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
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor'
          }

          if (
            id.includes('/@tanstack/react-router/') ||
            id.includes('/@tanstack/router-core/') ||
            id.includes('/@tanstack/history/') ||
            id.includes('/@tanstack/react-router-devtools/')
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

          if (id.includes('/three/examples/')) {
            return 'three-examples'
          }

          if (
            id.includes('/three/') ||
            id.includes('/@types/three/')
          ) {
            return 'three-core'
          }

          if (id.includes('/@react-three/fiber/')) {
            return 'three-fiber'
          }

          if (id.includes('/@react-three/drei/')) {
            return 'three-drei'
          }

          if (
            id.includes('/@react-three/postprocessing/') ||
            id.includes('/postprocessing/') ||
            id.includes('/three-stdlib/')
          ) {
            return 'three-effects'
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
