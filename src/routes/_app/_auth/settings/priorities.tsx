import { meQuery } from '@/features/auth'
import { PrioritiesPage, prioritiesSearchSchema } from '@/features/priorities'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

const PrioritiesRoute = () => {
  const { department } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: me } = useQuery(meQuery)

  return (
    <PrioritiesPage
      department={department}
      onDepartmentChange={next => void navigate({ search: { department: next }, replace: true })}
      userRole={me?.role ?? ''}
      userId={me?.id}
    />
  )
}

export const Route = createFileRoute('/_app/_auth/settings/priorities')({
  staticData: { crumb: 'Priorities' },
  validateSearch: prioritiesSearchSchema,
  component: PrioritiesRoute
})
