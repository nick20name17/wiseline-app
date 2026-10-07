import { meQuery } from '@/features/auth'
import {
  LoadingPage,
  daySearchSchema,
  shippingFallback,
  shippingPages,
  shippingRoleQuery
} from '@/features/shipping'
import { today } from '@/lib/days'
import { createFileRoute, redirect } from '@tanstack/react-router'

const LoadingRoute = () => {
  const { day } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <LoadingPage
      day={day ?? today()}
      onDayChange={next => void navigate({ search: { day: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/loading')({
  staticData: { crumb: 'Loading' },
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    const role = await context.queryClient.ensureQueryData(shippingRoleQuery(me))
    if (!shippingPages(me.role, role).loading)
      throw redirect({ to: shippingFallback(me.role, role), replace: true })
  },
  validateSearch: daySearchSchema,
  component: LoadingRoute
})
