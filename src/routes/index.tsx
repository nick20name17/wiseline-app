import { createFileRoute, redirect } from '@tanstack/react-router'

import { landingFor, landingSearchFor } from '@/session/landing'
import { viewerStore } from '@/session/viewer'

/**
 * The root, which the prototype never links to and every host asks for first.
 *
 * There was no index route at all: the review portal frames a build at `/`, so the whole port read as
 * its own 404 page — the one screen where nothing is worth commenting on.
 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const viewer = viewerStore.get()
    if (!viewer) throw redirect({ to: '/sign-in' })

    const to = landingFor(viewer.role, viewer.department)
    const search = landingSearchFor(viewer.role, viewer.department)
    throw redirect(search ? { to, search } : { to })
  }
})
