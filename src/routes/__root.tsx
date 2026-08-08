import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import type { QueryClient } from '@tanstack/react-query'

export type RouterContext = {
  queryClient: QueryClient
}

const RootComponent = () => {
  return <Outlet />
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
})
