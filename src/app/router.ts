import { RouteError } from '@/components/router/error'
import { RouteNotFound } from '@/components/router/not-found'
import { RoutePending } from '@/components/router/pending'
import { queryClient } from '@/lib/query-client'
import { routeTree } from '@/routeTree.gen'
import { createRouter } from '@tanstack/react-router'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultPendingMs: 100,
  defaultPendingMinMs: 300,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
  defaultPendingComponent: RoutePending
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
