import { Link, createFileRoute, redirect } from '@tanstack/react-router'

import { ForgetPasswordForm } from './-components/form'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AUTH_REDIRECTS } from '@/constants/routes'
import { isLoggedIn } from '@/helpers/auth'

const PasswordResetPage = () => {
  return (
    <section className='bg-grey-200 -m-4 flex h-screen items-center justify-center'>
      <div>
        <Card className='mx-auto w-84 gap-4 p-4 shadow-none md:w-153 md:p-10'>
          <CardHeader className='text-center'>
            <CardTitle>
              <h1 className='text-2xl'>Reset password</h1>
            </CardTitle>
            <CardDescription>No worries, weʼll send you reset instructions.</CardDescription>
          </CardHeader>
          <ForgetPasswordForm />
          <p className='text-center text-sm leading-none'>
            <span> Did you remember your password? </span>
            <Link
              className='hover:text-primary font-medium transition-colors'
              to='/login'
            >
              Back to Log in
            </Link>
          </p>
        </Card>
      </div>
    </section>
  )
}

export const Route = createFileRoute('/password/reset/')({
  component: PasswordResetPage,
  beforeLoad: async () => {
    const isAuth = isLoggedIn()
    if (isAuth) {
      throw redirect({ to: AUTH_REDIRECTS.loginSuccess, replace: true })
    }
  },
  head: () => {
    return {
      meta: [
        {
          title: 'Reset password'
        }
      ]
    }
  }
})
