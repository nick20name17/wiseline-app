import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_auth/settings/location-types')({
  staticData: { crumb: 'Location Types' },
  component: () => <PagePlaceholder title='Location Types' />
})
