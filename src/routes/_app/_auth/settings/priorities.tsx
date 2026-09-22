import { PrioritiesPage, prioritiesSearchSchema } from '@/features/priorities'
import { createFileRoute } from '@tanstack/react-router'

const PrioritiesRoute = () => {
  const { department } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <PrioritiesPage
      department={department}
      onDepartmentChange={next => void navigate({ search: { department: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/_auth/settings/priorities')({
  staticData: { crumb: 'Priorities' },
  validateSearch: prioritiesSearchSchema,
  component: PrioritiesRoute
})
