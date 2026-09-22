import { meQuery } from '@/features/auth'
import { TrimPage, trimSearchSchema } from '@/features/trim'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

const TrimRoute = () => {
  const { view, search } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: me } = useQuery(meQuery)

  return (
    <TrimPage
      view={view}
      search={search}
      role={me?.role ?? ''}
      onViewChange={next => void navigate({ search: previous => ({ ...previous, view: next }) })}
      onSearchChange={next =>
        void navigate({ search: previous => ({ ...previous, search: next }), replace: true })
      }
    />
  )
}

export const Route = createFileRoute('/_app/_auth/trim')({
  staticData: { crumb: 'Trim' },
  validateSearch: trimSearchSchema,
  component: TrimRoute
})
