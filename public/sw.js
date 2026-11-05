// The app that used to live on this domain was a PWA, and its service worker keeps serving that
// app from its cache. The browser replaces a worker only when this URL answers with a script, so
// this one stands in for it: it clears the old caches, removes itself and reloads open tabs.
// The app never registers a worker of its own.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
      await self.registration.unregister()
      const tabs = await self.clients.matchAll({ type: 'window' })
      await Promise.all(tabs.map(tab => tab.navigate(tab.url)))
    })()
  )
})
