import { meQuery } from '@/features/auth'
import { BoardGate, boardSearchSchema, prefetchBoard } from '@/features/board'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

const AccessoriesRoute = () => {
  const { view, search } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: me } = useQuery(meQuery)

  return (
    <BoardGate
      code='accessories'
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

export const Route = createFileRoute('/_app/accessories')({
  staticData: { crumb: 'Accessories' },
  validateSearch: boardSearchSchema,
  loaderDeps: ({ search }) => search,
  // Not awaited: the page draws its own placeholders, and a hover should not hold up anything.
  loader: ({ context, deps }) => {
    const me = context.queryClient.getQueryData(meQuery.queryKey)
    void prefetchBoard(context.queryClient, {
      ...deps,
      code: 'accessories',
      userId: me?.id,
      userRole: me?.role ?? ''
    })
  },
  component: AccessoriesRoute
})
