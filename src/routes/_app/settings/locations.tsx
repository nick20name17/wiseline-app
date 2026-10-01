import { LocationsPage, locationsSearchSchema } from '@/features/locations'
import { createFileRoute } from '@tanstack/react-router'

const LocationsRoute = () => {
  const { search, department } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <LocationsPage
      search={search}
      department={department}
      onSearchChange={next =>
        void navigate({ search: current => ({ ...current, search: next }), replace: true })
      }
      onDepartmentChange={next =>
        void navigate({ search: current => ({ ...current, department: next }), replace: true })
      }
    />
  )
}

export const Route = createFileRoute('/_app/settings/locations')({
  staticData: { crumb: 'Locations' },
  validateSearch: locationsSearchSchema,
  component: LocationsRoute
})
