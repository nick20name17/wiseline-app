import { homePath, meQuery } from '@/features/auth'
import { createFileRoute, redirect } from '@tanstack/react-router'

// There is no Dashboard yet (client-questions §9); `/` stays a route because the logo, the
// not-found page and sign-in point at it, and it sends each user to their own page.
export const Route = createFileRoute('/_app/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    throw redirect({ to: homePath(me), replace: true })
  }
})
