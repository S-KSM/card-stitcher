import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'icon.svg',
        'apple-touch-icon-180x180.png',
      ],
      manifest: {
        name: 'Card Stitcher',
        short_name: 'Cards',
        description: 'Scan greeting cards, stitch the pages into a keepsake.',
        theme_color: '#C2603A',
        background_color: '#FAF8F4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['lifestyle', 'productivity', 'photo'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,webmanifest,woff2}'],
        globIgnores: ['**/*.onnx', '**/assets/opencv-*.js'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /https:\/\/docs\.opencv\.org\/.*\/opencv\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'opencv-cdn-v1',
              expiration: { maxEntries: 3, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          {
            urlPattern: /https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ort-runtime-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 },
              rangeRequests: true,
            },
          },
          {
            urlPattern: /github\.com\/.*\/releases\/download\/.*\.onnx$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'enhance-models-v1',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              rangeRequests: true,
            },
          },
          {
            urlPattern: /objects\.githubusercontent\.com\/.*\.onnx.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'enhance-models-v1',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              rangeRequests: true,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  worker: { format: 'iife' },
  server: { port: 5173, host: true },
});
