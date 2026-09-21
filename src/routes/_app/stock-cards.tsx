import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/stock-cards')({
  staticData: { crumb: 'Stock Cards' },
  component: () => <PagePlaceholder title='Stock Cards' />
})
