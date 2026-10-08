import { managesUsers, meQuery } from '@/features/auth'
import { UsersPage, usersSearchSchema } from '@/features/users'
import { createFileRoute, redirect } from '@tanstack/react-router'

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
  // The server refuses the list to anyone else, so the tab is not offered and its URL moves on.
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!managesUsers(me.role)) throw redirect({ to: '/settings/machines', replace: true })
  },
  component: UsersRoute
})
