import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/trim')({
  staticData: { crumb: 'Trim' },
  component: () => <PagePlaceholder title='Trim' />
})
