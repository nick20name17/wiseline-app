import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/rollforming')({
  staticData: { crumb: 'Rollforming' },
  component: () => <PagePlaceholder title='Rollforming' />
})
