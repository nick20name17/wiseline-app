import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { viewerStore } from '@/session/viewer'

/**
 * No chrome of its own yet. The prototype's top bar is part of each page's own stylesheet and markup,
 * and it is lifted into a shared layout once more than one page has been ported — deciding what is
 * shared from a single example is how the shared thing ends up wrong.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!viewerStore.get()) throw redirect({ to: '/sign-in', search: { redirect: location.href } })
  },
  component: () => <Outlet />
})
