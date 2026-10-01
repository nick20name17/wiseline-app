import { meQuery } from '@/features/auth'
import { BoardGate, boardSearchSchema } from '@/features/board'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

const RollformingRoute = () => {
  const { view, search } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: me } = useQuery(meQuery)

  return (
    <BoardGate
      code='rollforming'
      view={view}
      search={search}
      userRole={me?.role ?? ''}
      userId={me?.id}
      onViewChange={next => void navigate({ search: previous => ({ ...previous, view: next }) })}
      onSearchChange={next =>
        void navigate({ search: previous => ({ ...previous, search: next }), replace: true })
      }
    />
  )
}

export const Route = createFileRoute('/_app/rollforming')({
  staticData: { crumb: 'Rollforming' },
  validateSearch: boardSearchSchema,
  component: RollformingRoute
})
