import type { ErrorComponentProps } from '@tanstack/react-router'
import { RotateCcw, TriangleAlert } from 'lucide-react'

import { BackHomeButton, StatusPage } from '@/components/status-page'
import { Button } from '@/components/ui/button'

export const ErrorPage = ({ error, reset }: ErrorComponentProps) => {
  const message = error instanceof Error ? error.message : String(error)

  return (
    <StatusPage
      code='500'
      icon={<TriangleAlert />}
      mediaClassName='bg-destructive/10 text-destructive'
      title='Something went wrong'
      description='An unexpected error occurred. You can try again, or head back home.'
      actions={
        <>
          <BackHomeButton variant='outline' />
          <Button onClick={() => reset()}>
            <RotateCcw data-icon='inline-start' />
            Try again
          </Button>
        </>
      }
    >
      {import.meta.env.DEV && message && (
        <pre className='text-muted-foreground bg-muted mt-2 max-h-40 w-full overflow-auto rounded-lg border p-3 text-left font-mono text-xs whitespace-pre-wrap'>
          {message}
        </pre>
      )}
    </StatusPage>
  )
}
