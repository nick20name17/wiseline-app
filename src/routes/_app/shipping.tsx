import { ShippingPage, shippingSearchSchema } from '@/features/shipping'
import { createFileRoute } from '@tanstack/react-router'

const ShippingRoute = () => {
  const { view, search, day } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <ShippingPage
      view={view}
      search={search}
      day={day}
      onChange={next =>
        void navigate({ search: previous => ({ ...previous, ...next }), replace: !next.view })
      }
    />
  )
}

export const Route = createFileRoute('/_app/shipping')({
  staticData: { crumb: 'Shipping' },
  validateSearch: shippingSearchSchema,
  component: ShippingRoute
})
