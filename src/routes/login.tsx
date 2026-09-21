import { LoginForm, loginSearchSchema, safeRedirectPath } from '@/features/auth'
import { sessionStore } from '@/lib/session-store'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

const LoginRoute = () => {
  const { next } = Route.useSearch()
  const navigate = useNavigate()

  return <LoginForm onSuccess={() => navigate({ to: safeRedirectPath(next), replace: true })} />
}

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ search }) => {
    if (!sessionStore.get()) return
    const to = safeRedirectPath(search.next)
    throw redirect({ to, replace: true })
  },
  component: LoginRoute
})
