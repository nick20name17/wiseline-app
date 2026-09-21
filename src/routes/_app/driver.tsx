import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/driver')({
  staticData: { crumb: 'Driver' },
  component: () => <PagePlaceholder title='Driver' />
})
