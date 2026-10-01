import { UsersPage, usersSearchSchema } from '@/features/users'
import { createFileRoute } from '@tanstack/react-router'

const UsersRoute = () => {
  const { search } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <UsersPage
      search={search}
      onSearchChange={next => void navigate({ search: { search: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/settings/users')({
  staticData: { crumb: 'Users' },
  validateSearch: usersSearchSchema,
  component: UsersRoute
})
