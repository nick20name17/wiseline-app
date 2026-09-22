import { LocationTypesPage, locationsSearchSchema } from '@/features/locations'
import { createFileRoute } from '@tanstack/react-router'

const LocationTypesRoute = () => {
  const { search } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <LocationTypesPage
      search={search}
      onSearchChange={next => void navigate({ search: { search: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/_auth/settings/location-types')({
  staticData: { crumb: 'Location Types' },
  validateSearch: locationsSearchSchema,
  component: LocationTypesRoute
})
