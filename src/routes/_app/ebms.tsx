import { EbmsPage } from '@/features/ebms'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/ebms')({
  staticData: { crumb: 'EBMS' },
  component: EbmsPage
})
