import { PagePlaceholder } from '@/components/page-placeholder'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/coils')({
  staticData: { crumb: 'Coils' },
  component: () => <PagePlaceholder title='Coils' />
})
