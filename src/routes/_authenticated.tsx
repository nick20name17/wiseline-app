import { Outlet, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'

import { useLogout } from '@/api/auth'
import { sessionStore } from '@/api/auth/session-store'
import { useSession } from '@/api/auth/use-session'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.get()) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
  },
  component: AuthenticatedLayout
})

function AuthenticatedLayout() {
  const session = useSession()
  const logout = useLogout()
  const router = useRouter()

  const signOut = async () => {
    await logout.mutateAsync()
    await router.navigate({ to: '/sign-in' })
  }

  return (
    <div className='flex min-h-svh flex-col'>
      <header className='flex h-14 items-center justify-between border-b px-6'>
        <span className='text-muted-foreground text-sm'>{session?.user.email}</span>
        <Button variant='outline' size='sm' onClick={signOut} disabled={logout.isPending}>
          <LogOut data-icon='inline-start' />
          Sign out
        </Button>
      </header>
      <main className='flex flex-1 items-center justify-center p-6'>
        <Outlet />
      </main>
    </div>
  )
}
