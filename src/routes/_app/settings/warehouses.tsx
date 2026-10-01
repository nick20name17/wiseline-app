import { WarehousesPage, warehousesSearchSchema } from '@/features/warehouses'
import { createFileRoute } from '@tanstack/react-router'

const WarehousesRoute = () => {
  const { search } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <WarehousesPage
      search={search}
      onSearchChange={next => void navigate({ search: { search: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/settings/warehouses')({
  staticData: { crumb: 'Warehouses' },
  validateSearch: warehousesSearchSchema,
  component: WarehousesRoute
})
