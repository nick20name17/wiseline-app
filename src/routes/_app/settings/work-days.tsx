import { WorkDaysPage, holidaysSearchSchema } from '@/features/holidays'
import { createFileRoute } from '@tanstack/react-router'

const WorkDaysRoute = () => {
  const { year } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <WorkDaysPage
      year={year}
      onYearChange={next => void navigate({ search: { year: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/_app/settings/work-days')({
  staticData: { crumb: 'Work Days' },
  validateSearch: holidaysSearchSchema,
  component: WorkDaysRoute
})
