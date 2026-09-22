import { LocationsPage, locationsSearchSchema } from '@/features/locations'
import { createFileRoute } from '@tanstack/react-router'

const LocationsRoute = () => {
  const { search } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <LocationsPage
      search={search}
      onSearchChange={next => void navigate({ search: { search: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/_auth/settings/locations')({
  staticData: { crumb: 'Locations' },
  validateSearch: locationsSearchSchema,
  component: LocationsRoute
})
