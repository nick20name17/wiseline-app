import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/')({
  staticData: { crumb: 'Dashboard' },
  component: () => <PagePlaceholder title='Dashboard' />
})
