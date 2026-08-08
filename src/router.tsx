import { createRouter } from '@tanstack/react-router'

import { ErrorPage } from '@/routes/-error'
import { NotFoundPage } from '@/routes/-not-found'
import { routeTree } from './routeTree.gen'

import { queryClient } from './lib/query-client'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: { queryClient },
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 5_000,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ErrorPage
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
