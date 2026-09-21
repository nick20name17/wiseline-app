import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_auth/settings/locations')({
  staticData: { crumb: 'Locations' },
  component: () => <PagePlaceholder title='Locations' />
})
