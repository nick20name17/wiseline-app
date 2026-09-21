import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { Moon } from 'lucide-react'

import { ModeToggle } from '@/components/theme/mode-toggle'
import { buttonVariants } from '@/components/ui/button'
import { useIsAuthenticated } from '@/lib/session-store'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/moon', label: 'Moon phase' }
] as const

const RootComponent = () => {
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className='flex min-h-svh flex-col bg-background text-foreground'>
      <header className='sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur'>
        <div className='mx-auto flex h-14 w-full max-w-3xl items-center gap-6 px-6'>
          <Link
            to='/'
            className='flex items-center gap-2 font-heading text-sm font-semibold tracking-widest uppercase'
          >
            <Moon className='size-4' />
            Wiseline PM
          </Link>
          <nav className='flex items-center gap-4 text-sm'>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === '/' }}
                className='text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground'
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className='ml-auto flex items-center gap-3'>
            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {isAuthenticated ? 'Profile' : 'Log in'}
            </Link>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className='mx-auto w-full max-w-3xl flex-1 px-6 py-12'>
        <Outlet />
      </main>

      <footer className='border-t border-border'>
        <div className='mx-auto w-full max-w-3xl px-6 py-6 text-xs text-muted-foreground'>
          Phases are computed locally from a mean synodic month. Auth talks to the Wiseline API.
        </div>
      </footer>
    </div>
  )
}

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
})
