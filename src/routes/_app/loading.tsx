import { guardPage } from '@/app/pages'
import { LoadingPage, daySearchSchema } from '@/features/shipping'
import { today } from '@/lib/days'
import { createFileRoute } from '@tanstack/react-router'

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
  beforeLoad: ({ context }) => guardPage(context.queryClient, '/loading'),
  validateSearch: daySearchSchema,
  component: LoadingRoute
})
