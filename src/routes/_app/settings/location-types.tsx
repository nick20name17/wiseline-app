import { LocationTypesPage, locationsSearchSchema } from '@/features/locations'
import { createFileRoute } from '@tanstack/react-router'

const LocationTypesRoute = () => {
  const { search, department, kind } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <LocationTypesPage
      search={search}
      department={department}
      kind={kind ?? 'order'}
      onSearchChange={next =>
        void navigate({ search: current => ({ ...current, search: next }), replace: true })
      }
      onDepartmentChange={next =>
        void navigate({ search: current => ({ ...current, department: next }), replace: true })
      }
      onKindChange={next =>
        void navigate({ search: current => ({ ...current, kind: next }), replace: true })
      }
    />
  )
}

export const Route = createFileRoute('/_app/settings/location-types')({
  staticData: { crumb: 'Location Types' },
  validateSearch: locationsSearchSchema,
  component: LocationTypesRoute
})
