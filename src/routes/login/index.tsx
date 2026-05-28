import { Link, createFileRoute, redirect } from '@tanstack/react-router'

import { LoginForm } from './-components/form'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AUTH_REDIRECTS } from '@/constants/routes'
import { isLoggedIn } from '@/helpers/auth'

const LoginPage = () => {
  return (
    <section className='bg-grey-200 -m-4 flex h-screen items-center justify-center'>
      <div>
        <Card className='mx-auto w-84 gap-4 p-4 shadow-none md:w-153 md:p-10'>
          <CardHeader className='text-center'>
            <CardTitle>
              <h1 className='text-2xl'>Welcome back</h1>
            </CardTitle>
            <CardDescription>Please enter your details.</CardDescription>
          </CardHeader>
          <LoginForm />
          <Link
            className='hover:text-primary text-center text-sm leading-none transition-colors'
            to='/password/reset'
          >
            Forgot password?
          </Link>
        </Card>
      </div>
    </section>
  )
}

export const Route = createFileRoute('/login/')({
  component: LoginPage,
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
          title: 'Login'
        }
      ]
    }
  }
})
