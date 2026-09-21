import { buttonVariants } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'

export const RouteNotFound = () => {
  return (
    <div className='flex flex-col items-start gap-4 border border-border p-6'>
      <div className='flex items-center gap-2 text-muted-foreground'>
        <SearchX className='size-4' />
        <p className='text-xs tracking-widest uppercase'>Page not found</p>
      </div>
      <p className='max-w-prose text-sm text-muted-foreground'>
        The page you are looking for does not exist or has moved.
      </p>
      <Link to='/' className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Go home
      </Link>
    </div>
  )
}
