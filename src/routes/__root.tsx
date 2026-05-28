import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { HeadContent, Outlet, createRootRouteWithContext, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import { Error } from './-components/error'
import { NotFound } from './-components/not-found'
import { Toaster } from '@/components/ui/sonner'
import { PUBLIC_PAGES, canAccessPage, getUserPages } from '@/config/permissions/pages'
import { AUTH_REDIRECTS } from '@/constants/routes'
import { getSession } from '@/helpers/auth'
import { AuthProvider } from '@/providers/auth'
import type { RouteNames } from '@/types/routes'

const RootLayout = () => {
  return (
    <AuthProvider>
      <HeadContent />
      <Outlet />
      <Toaster
        duration={5000}
        richColors
      />
      <TanStackDevtools
        plugins={[
          {
            name: 'TanStack Query',
            render: <ReactQueryDevtoolsPanel />
          },
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />
          }
        ]}
      />
    </AuthProvider>
  )
}

const normalize = (route: string) => route.replace(/\/+$/, '') as RouteNames

export const Route = createRootRouteWithContext()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: Error,

  beforeLoad: (ctx) => {
    const user = getSession()?.user

    const page = normalize(ctx.matches.at(-1)?.fullPath || '') || '/'

    const redirectTo = (to: string) => redirect({ to, replace: true })

    const isPublicPage = PUBLIC_PAGES.has(page)

    if (!user) {
      if (isPublicPage) return
      throw redirectTo(AUTH_REDIRECTS.logout)
    }

    if (!canAccessPage(user, page)) {
      const [firstAllowedPage] = getUserPages(user)
      throw redirectTo(firstAllowedPage ?? '/')
    }
  }
})
