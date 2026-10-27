import { isManagerRole, meQuery } from '@/features/auth'
import { WorkDaysPage, workDaysSearchSchema } from '@/features/holidays'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

const WorkDaysRoute = () => {
  const { year, view } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: me } = useQuery(meQuery)
  const role = me?.role ?? ''

  return (
    <WorkDaysPage
      year={year}
      onYearChange={next =>
        void navigate({ search: prev => ({ ...prev, year: next }), replace: true })
      }
      view={view}
      onViewChange={next =>
        void navigate({ search: prev => ({ ...prev, view: next }), replace: true })
      }
      // The server takes the week from an Admin only, and single days from a Manager as well.
      canEditWeek={role === 'admin'}
      canEditDays={isManagerRole(role)}
    />
  )
}

export const Route = createFileRoute('/_app/settings/work-days')({
  staticData: { crumb: 'Work Days' },
  validateSearch: workDaysSearchSchema,
  component: WorkDaysRoute
})
