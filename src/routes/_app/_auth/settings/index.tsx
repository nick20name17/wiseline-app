import { createFileRoute, redirect } from '@tanstack/react-router'

// Settings is only ever its tabs; the first one stands in for the section itself.
export const Route = createFileRoute('/_app/_auth/settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/users', replace: true })
  }
})
