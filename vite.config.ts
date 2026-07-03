import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// IMPORTANT — GitHub Pages blank-page fix:
// Project pages are served from a subpath, e.g. https://<user>.github.io/<repo>/.
// Using an ABSOLUTE base like '/repo-name/' only works if it exactly matches
// the live URL's subpath — if the repo gets renamed, deployed from a fork, or
// the build ever runs without the GITHUB_PAGES_BASE env var set, every asset
// (JS/CSS) 404s and the page renders completely blank (index.html loads, but
// the app's script never runs). A RELATIVE base ('./') sidesteps this
// entirely: every asset is requested relative to wherever index.html itself
// was served from, so it works correctly no matter what subpath, repo name,
// or custom domain the site ends up on. Combined with HashRouter (already
// used in main.tsx), this is the most robust setup for GitHub Pages.
const base = './'

export default defineConfig({
  base,
  // Baked-in build timestamp, shown small on the login screen (AuthPage) and
  // logged to the console on boot. Lets anyone confirm — just by looking at
  // the live site, no repo access needed — whether a given deploy actually
  // took effect, instead of guessing whether "still broken" means the fix
  // didn't work or the browser is just still serving an old cached build.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Service worker strategy: generateSW for maximum Lighthouse score
      strategies: 'generateSW',
      includeAssets: [
        'favicon.ico',
        'icons/favicon-16.png',
        'icons/favicon-32.png',
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-192-maskable.png',
        'icons/icon-512-maskable.png',
      ],
      manifest: {
        name: 'ESL Learning',
        short_name: 'ESL Learning',
        description: 'English vocabulary learning app with flashcards, quizzes, and more.',
        theme_color: '#1A1A2E',
        background_color: '#1A1A2E',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        scope: base,
        start_url: base,
        id: base,
        lang: 'en',
        dir: 'ltr',
        prefer_related_applications: false,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
        screenshots: [
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'ESL Learning — Vocabulary Learning',
          },
        ],
        categories: ['education', 'productivity'],
        shortcuts: [
          {
            name: 'Flashcards',
            short_name: 'Flash',
            description: 'Study with flashcards',
            url: base + '#/study/flashcards',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Quick Quiz',
            short_name: 'Quiz',
            description: 'Test your knowledge',
            url: base + '#/study/quiz',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Cache everything for full offline support
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        // Clean up old cache on activation
        cleanupOutdatedCaches: true,
        // Client claim immediately
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache API calls with network-first (fall back to cache)
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion-vendor': ['framer-motion'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
