import { ForgotPasswordForm } from '@/features/auth'
import { createFileRoute } from '@tanstack/react-router'

const ForgotPasswordRoute = () => (
  <div className='grid min-h-svh place-items-center bg-background bg-primary-glow p-6'>
    <ForgotPasswordForm />
  </div>
)

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordRoute
})
