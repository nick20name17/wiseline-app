import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/loading')({
  staticData: { crumb: 'Loading' },
  component: () => <PagePlaceholder title='Loading' />
})
