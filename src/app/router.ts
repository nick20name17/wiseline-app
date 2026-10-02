import { RouteError } from '@/components/router/error'
import { RouteNotFound } from '@/components/router/not-found'
import { RoutePending } from '@/components/router/pending'
import { queryClient } from '@/lib/query-client'
import { sessionStore } from '@/lib/session-store'
import { routeTree } from '@/routeTree.gen'
import { createRouter } from '@tanstack/react-router'

// The hub serves a review under `/a/:versionId/` and takes the prefix off once the page has loaded,
// which is after this module has read the address: the first page a review opens would be read as
// `/a/…` and land on Not Found. Taking it off here first is the same rewrite, done in time.
if (import.meta.env.VITE_REVIEW) {
  const path = location.pathname.replace(/^\/a\/[^/]+/, '') || '/'
  if (path !== location.pathname)
    history.replaceState(history.state, '', path + location.search + location.hash)
}

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

// A session that ends while a page is open — a refresh that failed, a log out in another tab — sends
// the page back through its guard, so a visitor never keeps looking at the signed-in shell.
sessionStore.subscribe(() => {
  if (!sessionStore.get()) void router.invalidate()
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }

  // The app header builds its breadcrumb from the matched routes, so a route opts in by
  // naming itself here instead of the header hardcoding a path table.
  interface StaticDataRouteOption {
    crumb?: string
  }
}
