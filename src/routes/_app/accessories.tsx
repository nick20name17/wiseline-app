import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/accessories')({
  staticData: { crumb: 'Accessories' },
  component: () => <PagePlaceholder title='Accessories' />
})
