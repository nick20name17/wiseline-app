import { homePath, meQuery } from '@/features/auth'
import { createFileRoute, redirect } from '@tanstack/react-router'

// There is no Dashboard yet (client-questions §9); `/` stays a route because the logo, the
// not-found page and logout all point at it, and it is where each user's own board is decided.
export const Route = createFileRoute('/_app/')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQuery)
    throw redirect({ to: homePath(user), replace: true })
  }
})
