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
  beforeLoad: async ({ search }) => {
    // The hub puts a build's storage back to the state it saved, which drops the session; a review
    // signs straight back in rather than stopping at the door.
    if (import.meta.env.VITE_REVIEW && !sessionStore.get()) {
      ;(await import('@/mocks/start')).signInForReview()
    }
    if (!sessionStore.get()) return
    const to = safeRedirectPath(search.redirect)
    throw redirect({ to, replace: true })
  },
  component: LoginRoute
})
