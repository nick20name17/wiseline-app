import { disableReactDevTools } from '@fvilers/disable-react-devtools'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { Providers } from './providers'
import '@/index.css'
import { routeTree } from '@/routeTree.gen'

if (import.meta.env.PROD) {
  disableReactDevTools()
}

registerSW({ immediate: true })

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
