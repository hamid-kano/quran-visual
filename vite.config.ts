import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the site under /<repo>/
const base = process.env.BASE_PATH ?? '/quran-visual/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // registered by src/lib/appUpdate.ts, which also moves an open page onto a new version
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'آيات مرئية — منصة التحليل البياني للقرآن الكريم',
        short_name: 'آيات مرئية',
        description: 'استكشاف بصري لسور القرآن الكريم وجذوره وارتباطاته',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#0d1d33',
        background_color: '#0d1d33',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // a new version takes over open pages at once (see src/lib/appUpdate.ts)
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            // Only this site's own data. The pattern is written into the service worker as a regular
            // expression, and Workbox applies one to other origins only when it matches from the
            // start of the address, so recitation audio (everyayah.com/data/…) is never cached here.
            urlPattern: new RegExp(`${base.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}data/`),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'quran-data' },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    // read by scripts/prerender.ts to point each page at the code it needs, then deleted
    manifest: true,
    chunkSizeWarningLimit: 1200,
  },
})
