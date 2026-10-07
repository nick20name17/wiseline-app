import { meQuery } from '@/features/auth'
import {
  DriverPage,
  daySearchSchema,
  shippingFallback,
  shippingPages,
  shippingRoleQuery
} from '@/features/shipping'
import { today } from '@/lib/days'
import { createFileRoute, redirect } from '@tanstack/react-router'

const DriverRoute = () => {
  const { day } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <DriverPage
      day={day ?? today()}
      onDayChange={next => void navigate({ search: { day: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/driver')({
  staticData: { crumb: 'Driver' },
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    const role = await context.queryClient.ensureQueryData(shippingRoleQuery(me))
    if (!shippingPages(me.role, role).driver)
      throw redirect({ to: shippingFallback(me.role, role), replace: true })
  },
  validateSearch: daySearchSchema,
  component: DriverRoute
})
