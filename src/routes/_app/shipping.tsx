import { meQuery } from '@/features/auth'
import {
  ShippingPage,
  shippingSearchSchema,
  shippingFallback,
  shippingPages,
  shippingRoleQuery
} from '@/features/shipping'
import { createFileRoute, redirect } from '@tanstack/react-router'

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
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    const role = await context.queryClient.ensureQueryData(shippingRoleQuery(me))
    if (!shippingPages(me.role, role).shipping)
      throw redirect({ to: shippingFallback(me.role, role), replace: true })
  },
  validateSearch: shippingSearchSchema,
  component: ShippingRoute
})
