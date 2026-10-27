import { guardPage } from '@/app/pages'
import { ShippingPage, shippingSearchSchema } from '@/features/shipping'
import { createFileRoute } from '@tanstack/react-router'

const ShippingRoute = () => {
  const { view, search, day, shipFrom, shipTo } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <ShippingPage
      view={view}
      search={search}
      day={day}
      shipDates={{ shipFrom, shipTo }}
      onChange={next =>
        void navigate({ search: previous => ({ ...previous, ...next }), replace: !next.view })
      }
    />
  )
}

export const Route = createFileRoute('/_app/shipping')({
  staticData: { crumb: 'Shipping' },
  beforeLoad: ({ context }) => guardPage(context.queryClient, '/shipping'),
  validateSearch: shippingSearchSchema,
  component: ShippingRoute
})
