import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { PageHeaderProvider } from '@/components/layout/page-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { UserMenu, isManagerRole, meQuery } from '@/features/auth'
import { shippingPages, shippingRoleQuery } from '@/features/shipping'
import { sessionStore } from '@/lib/session-store'
import { useQuery } from '@tanstack/react-query'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

// Until the user and their Shipping role are known, the gated links stay out rather than flicker in.
const hiddenPages = (role: string | undefined, shippingRole: string | null | undefined) => {
  const manager = !!role && isManagerRole(role)
  const pages = role && shippingRole !== undefined ? shippingPages(role, shippingRole) : null
  return new Set([
    ...(manager ? [] : ['/settings', '/stock-cards']),
    ...(pages?.shipping ? [] : ['/shipping']),
    ...(pages?.loading ? [] : ['/loading']),
    ...(pages?.driver ? [] : ['/driver'])
  ])
}

const AppLayout = () => {
  const { data: me } = useQuery(meQuery)
  const { data: shippingRole } = useQuery({
    ...shippingRoleQuery(me ?? { id: 0, role: '' }),
    enabled: !!me
  })
  const hidden = hiddenPages(me?.role, shippingRole)

  return (
    <SidebarProvider>
      <PageHeaderProvider>
        <AppSidebar hidden={hidden} />
        {/* `min-w-0` here and below: a flex item defaults to `min-width: auto`, so a table wider than
          the pane would push the whole layout sideways instead of scrolling within its own box. */}
        <SidebarInset className='min-w-0'>
          <AppHeader actions={<UserMenu />} />
          {/* SidebarInset is already the <main> landmark, so this is only the page's padding box. */}
          <div className='flex min-w-0 flex-1 flex-col gap-6 p-6'>
            <Outlet />
          </div>
        </SidebarInset>
      </PageHeaderProvider>
    </SidebarProvider>
  )
}

export const Route = createFileRoute('/_app')({
  // The whole shell is signed-in only: a visitor sees the sign-in page, not an empty app.
  beforeLoad: ({ location }) => {
    if (!sessionStore.get()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AppLayout
})
