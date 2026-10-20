import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { PageHeaderProvider } from '@/components/layout/page-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useIsWide } from '@/hooks/use-mobile'
import { PAGES, pagesQuery } from '@/app/pages'
import { UserMenu, meQuery } from '@/features/auth'
import { sessionStore } from '@/lib/session-store'
import { useQuery } from '@tanstack/react-query'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'

const AppLayout = () => {
  const { data: me, isPending: findingMe } = useQuery(meQuery)
  const { data: pages, isPending: findingPages } = useQuery({
    ...pagesQuery(me ?? { id: 0, role: '' }),
    enabled: !!me
  })
  // A page this user may not open is not offered; its URL typed by hand is turned away by its route.
  // Until it is known which, every link is drawn as a placeholder rather than flickering in.
  const hidden = new Set(PAGES.filter(page => !pages?.[page]))

  // A desk gets the full sidebar and a tablet the icon rail, which leaves a board's cards the width.
  // Either is opened or closed by hand from there, until the window crosses into the other.
  const wide = useIsWide()
  const [toggled, setToggled] = useState<{ wide: boolean; open: boolean }>()
  const open = toggled?.wide === wide ? toggled.open : wide

  return (
    <SidebarProvider open={open} onOpenChange={next => setToggled({ wide, open: next })}>
      <PageHeaderProvider>
        {/* A disabled query stays pending, so the role is waited on only once there is a user. A
            failed request is not pending, so the placeholders give way to the links it allows. */}
        <AppSidebar
          hidden={hidden}
          pending={findingMe || (!!me && findingPages)}
          footer={<UserMenu />}
        />
        {/* `min-w-0` here and below: a flex item defaults to `min-width: auto`, so a table wider than
          the pane would push the whole layout sideways instead of scrolling within its own box. */}
        <SidebarInset className='min-w-0'>
          <AppHeader />
          {/* SidebarInset is already the <main> landmark, so this is only the page's padding box. A
              phone gives the page its edges back, clear of its notch and home indicator. */}
          <div className='flex min-w-0 flex-1 flex-col gap-4 px-safe-3 pt-3 pb-safe-3 sm:gap-6 sm:px-safe-6 sm:py-6'>
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
