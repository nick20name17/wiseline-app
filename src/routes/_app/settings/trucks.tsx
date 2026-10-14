import { searchOnlySchema } from '@/lib/search-term'
import { TrucksPage } from '@/features/trucks'
import { createFileRoute } from '@tanstack/react-router'

const TrucksRoute = () => {
  const { search } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <TrucksPage
      search={search}
      onSearchChange={next => void navigate({ search: { search: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/settings/trucks')({
  staticData: { crumb: 'Trucks' },
  validateSearch: searchOnlySchema,
  component: TrucksRoute
})
