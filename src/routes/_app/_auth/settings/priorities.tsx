import { PrioritiesPage, prioritiesSearchSchema } from '@/features/priorities'
import { createFileRoute } from '@tanstack/react-router'

const PrioritiesRoute = () => {
  const { search } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <PrioritiesPage
      search={search}
      onSearchChange={next => void navigate({ search: { search: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/_auth/settings/priorities')({
  staticData: { crumb: 'Priorities' },
  validateSearch: prioritiesSearchSchema,
  component: PrioritiesRoute
})
