import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { useRouter } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'

interface RouteErrorProps {
  error: unknown
}

// The boundary clears itself once invalidate() produces a new match, so calling the
// router's `reset` first only makes it re-catch the same error.
export const RouteError = ({ error }: RouteErrorProps) => {
  const router = useRouter()

  return (
    <div className='flex flex-col items-start gap-4 border border-border p-6'>
      <div className='flex items-center gap-2 text-destructive'>
        <TriangleAlert className='size-4' />
        <p className='text-xs tracking-widest uppercase'>Something went wrong</p>
      </div>
      <p className='max-w-prose text-sm text-muted-foreground'>{getErrorMessage(error)}</p>
      <Button variant='outline' onClick={() => void router.invalidate()}>
        Try again
      </Button>
    </div>
  )
}
