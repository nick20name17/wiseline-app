import { EbmsPage, ebmsSearchSchema } from '@/features/ebms'
import { createFileRoute } from '@tanstack/react-router'

const EbmsRoute = () => {
  const { status } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <EbmsPage
      status={status}
      onStatusChange={next => void navigate({ search: { status: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/settings/ebms')({
  staticData: { crumb: 'EBMS' },
  validateSearch: ebmsSearchSchema,
  component: EbmsRoute
})
