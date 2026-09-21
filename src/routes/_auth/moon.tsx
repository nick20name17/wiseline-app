import { MoonPage, moonSearchSchema } from '@/features/moon'
import { createFileRoute } from '@tanstack/react-router'

const MoonRoute = () => {
  const { date } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <MoonPage
      dateParam={date}
      onDateChange={next =>
        void navigate({ search: next === undefined ? {} : { date: next }, replace: true })
      }
    />
  )
}

export const Route = createFileRoute('/_auth/moon')({
  validateSearch: moonSearchSchema,
  component: MoonRoute
})
