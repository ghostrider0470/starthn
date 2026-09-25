import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

/**
 * Exact npm package name → vendor chunk. Only packages that every public page
 * needs belong here; anything else is left to Rollup's default splitting.
 */
const PACKAGE_CHUNKS = new Map<string, string>([
  ['react', 'react-vendor'],
  ['react-dom', 'react-vendor'],
  ['scheduler', 'react-vendor'],
  ['use-sync-external-store', 'react-vendor'],
  ['react-i18next', 'react-vendor'],
  ['@tanstack/react-router', 'router'],
  ['@tanstack/router-core', 'router'],
  ['@tanstack/history', 'router'],
  ['lucide-react', 'icons'],
  ['motion', 'motion'],
  ['framer-motion', 'motion'],
  ['motion-dom', 'motion'],
  ['motion-utils', 'motion'],
  ['i18next', 'i18n'],
])

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    // Auto-reload when locale JSON files change
    {
      name: 'locale-hmr',
      configureServer(server) {
        const localeGlob = './public/locales/**/*.json'
        server.watcher.add(localeGlob)
        server.watcher.on('change', (path) => {
          if (path.includes('public/locales') && path.endsWith('.json')) {
            server.ws.send({ type: 'full-reload' })
          }
        })
      },
    },
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
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 'hidden' still emits .map files (for error symbolication) but drops the
    // sourceMappingURL comment, so browsers never fetch them.
    sourcemap: 'hidden',
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

          // Resolve the package name from the LAST node_modules segment, so
          // nested deps and scoped packages match exactly. Substring checks
          // such as '/react/' also matched '@tiptap/react/' and pulled the
          // whole TipTap/ProseMirror editor into react-vendor on every page.
          const pkg = id.match(/.*node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]
          if (!pkg) return

          const chunk = PACKAGE_CHUNKS.get(pkg)
          if (chunk) return chunk

          if (pkg === 'echarts') return 'echarts-core'
          if (pkg === 'zrender') return 'echarts-renderer'
          if (pkg === 'compromise') return 'nlp-compromise'
          if (pkg === 'franc') return 'nlp-franc'
          if (pkg === 'sentiment') return 'nlp-sentiment'

          if (
            pkg === 'world-atlas' ||
            pkg === 'topojson-client' ||
            pkg === 'earcut' ||
            pkg === 'polygon-clipping'
          ) {
            return 'geo-vendor'
          }

          // Everything else (incl. @tiptap/*, prosemirror-*, @floating-ui/*)
          // is left to Rollup so it lands only in the chunks that import it.
        },
      },
    },
    chunkSizeWarningLimit: 725,
  },
})
