import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/shipping')({
  staticData: { crumb: 'Shipping' },
  component: () => <PagePlaceholder title='Shipping' />
})
