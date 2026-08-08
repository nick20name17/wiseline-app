import { useRouter } from '@tanstack/react-router'
import { ArrowLeft, SearchX } from 'lucide-react'

import { BackHomeButton, StatusPage } from '@/components/status-page'
import { Button } from '@/components/ui/button'

export const NotFoundPage = () => {
  const router = useRouter()

  return (
    <StatusPage
      code='404'
      icon={<SearchX />}
      title='Page not found'
      description='The page you’re looking for doesn’t exist or may have been moved.'
      actions={
        <>
          <Button variant='outline' onClick={() => router.history.back()}>
            <ArrowLeft data-icon='inline-start' />
            Go back
          </Button>
          <BackHomeButton />
        </>
      }
    />
  )
}
