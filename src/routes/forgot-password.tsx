import { ForgotPasswordForm } from '@/features/auth'
import { createFileRoute } from '@tanstack/react-router'

const ForgotPasswordRoute = () => (
  <div className='grid min-h-svh place-items-center bg-background bg-primary-glow px-safe-6 pt-6 pb-safe-6'>
    <ForgotPasswordForm />
  </div>
)

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordRoute
})
