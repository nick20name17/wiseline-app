import { RiGhostFill, RiHome2Fill } from '@remixicon/react'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export const NotFound = () => {
  return (
    <>
      <title>Not Found</title>
      <div className='from-background to-muted/30 flex h-screen flex-col items-center justify-center bg-linear-to-b'>
        <div className='container flex max-w-md flex-col items-center justify-center gap-6 px-4 py-16 text-center md:py-24'>
          <div className='bg-muted rounded-full p-6'>
            <RiGhostFill className='text-primary size-12' />
          </div>

          <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>Page not found</h1>

          <p className='text-muted-foreground'>
            We couldn't find the page you were looking for. It might have been moved, deleted, or
            never existed in the first place.
          </p>

          <div className='flex flex-col gap-2 sm:flex-row'>
            <Button
              asChild
              size='lg'
            >
              <Link to='/'>
                <RiHome2Fill className='size-4' />
                Go home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
