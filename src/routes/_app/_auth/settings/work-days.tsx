import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_auth/settings/work-days')({
  staticData: { crumb: 'Work Days' },
  component: () => <PagePlaceholder title='Work Days' />
})
