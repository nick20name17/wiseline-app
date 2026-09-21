import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_auth/settings/warehouses')({
  staticData: { crumb: 'Warehouses' },
  component: () => <PagePlaceholder title='Warehouses' />
})
