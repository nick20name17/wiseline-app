import { LoginForm, loginSearchSchema, safeRedirectPath } from '@/features/auth'
import { sessionStore } from '@/lib/session-store'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

const LoginRoute = () => {
  const { redirect: redirectTo } = Route.useSearch()
  const navigate = useNavigate()

  return (
    <div className='grid min-h-svh place-items-center bg-background bg-primary-glow p-6'>
      <LoginForm onSuccess={() => navigate({ to: safeRedirectPath(redirectTo), replace: true })} />
    </div>
  )
}

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ search }) => {
    if (!sessionStore.get()) return
    const to = safeRedirectPath(search.redirect)
    throw redirect({ to, replace: true })
  },
  component: LoginRoute
})
