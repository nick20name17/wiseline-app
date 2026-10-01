import { DEFAULT_AFTER_LOGIN } from '@/features/auth'
import { createFileRoute, redirect } from '@tanstack/react-router'

// There is no Dashboard yet (client-questions §9); `/` stays a route because the logo, the
// not-found page and logout all point at it.
export const Route = createFileRoute('/_app/')({
  beforeLoad: () => {
    throw redirect({ to: DEFAULT_AFTER_LOGIN, replace: true })
  }
})
