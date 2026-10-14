import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { getErrorMessage } from '@/lib/errors'
import { TriangleAlert } from 'lucide-react'

type QueryErrorProps = { title: string; error: unknown; onRetry: () => void }

/** What a failed read says in place of its content: what did not load, why, and a way to ask again. */
export const QueryError = ({ title, error, onRetry }: QueryErrorProps) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant='icon'>
        <TriangleAlert />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
    </EmptyHeader>
    <Button variant='outline' onClick={onRetry}>
      Try again
    </Button>
  </Empty>
)
