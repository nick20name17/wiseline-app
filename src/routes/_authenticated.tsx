import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { DEPARTMENT_PAGE } from '@/components/shell/role-menu'
import { isScoped, viewerStore } from '@/session/viewer'

/**
 * No chrome of its own yet. The prototype's top bar is part of each page's own stylesheet and markup,
 * and it is lifted into a shared layout once more than one page has been ported — deciding what is
 * shared from a single example is how the shared thing ends up wrong.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const viewer = viewerStore.get()
    if (!viewer) throw redirect({ to: '/sign-in', search: { redirect: location.href } })

    // a viewer scoped to one department has no business on another one's board — the prototype sends
    // them to their own on load, not merely hiding the rail item that would have got them here
    if (!isScoped(viewer.role) || viewer.department === 'all') return

    const own = DEPARTMENT_PAGE[viewer.department]
    const elsewhere = Object.values(DEPARTMENT_PAGE).find(
      page => page !== own && location.pathname.startsWith(page)
    )
    if (elsewhere) throw redirect({ to: own })
  },
  component: () => <Outlet />
})
