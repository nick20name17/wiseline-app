import { type VitePWAOptions } from 'vite-plugin-pwa'

export const pwaConfig: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg'],
  workbox: {
    cleanupOutdatedCaches: true
  },
  manifest: {
    name: 'Wiseline',
    short_name: 'Wiseline',
    description: 'Production management system',
    start_url: '/',
    display: 'standalone',
    background_color: '#292929',
    theme_color: '#1fbd68',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  }
}
