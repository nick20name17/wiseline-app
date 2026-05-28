import { createFileRoute } from '@tanstack/react-router'

import { ResetConfirmPasswordForm } from './-components/confirm-form'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

const PasswordResetConfirmPage = () => {
  return (
    <section className='bg-grey-200 -m-4 flex h-screen items-center justify-center'>
      <div>
        <Card className='mx-auto w-84 gap-4 p-4 shadow-none md:w-153 md:p-10'>
          <CardHeader className='text-center'>
            <CardTitle>
              <h1 className='text-2xl'>Set new password</h1>
            </CardTitle>
          </CardHeader>
          <ResetConfirmPasswordForm />
        </Card>
      </div>
    </section>
  )
}

export const Route = createFileRoute('/password/reset/$token/$uid64')({
  component: PasswordResetConfirmPage
})
