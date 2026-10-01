import { DriverPage, daySearchSchema } from '@/features/shipping'
import { today } from '@/lib/days'
import { createFileRoute } from '@tanstack/react-router'

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
  validateSearch: daySearchSchema,
  component: DriverRoute
})
