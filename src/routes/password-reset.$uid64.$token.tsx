import { ResetPasswordForm } from '@/features/auth'
import { createFileRoute } from '@tanstack/react-router'

// The reset email points here: `/password-reset/<uid64>/<token>/`.
const ResetPasswordRoute = () => {
  const { uid64, token } = Route.useParams()

  return (
    <div className='grid min-h-svh place-items-center bg-background bg-primary-glow p-6'>
      <ResetPasswordForm uid64={uid64} token={token} />
    </div>
  )
}

export const Route = createFileRoute('/password-reset/$uid64/$token')({
  component: ResetPasswordRoute
})
