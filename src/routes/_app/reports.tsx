import { guardPage } from '@/app/pages'
import { ReportsPage, periodOf, reportsSearchSchema } from '@/features/reports'
import { today } from '@/lib/days'
import { createFileRoute } from '@tanstack/react-router'

const ReportsRoute = () => {
  const { department, from, to } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <ReportsPage
      department={department}
      period={periodOf(from, to, today())}
      onDepartmentChange={next =>
        void navigate({ search: current => ({ ...current, department: next }), replace: true })
      }
      onPeriodChange={next =>
        void navigate({ search: current => ({ ...current, ...next }), replace: true })
      }
    />
  )
}

export const Route = createFileRoute('/_app/reports')({
  staticData: { crumb: 'Reports' },
  validateSearch: reportsSearchSchema,
  beforeLoad: ({ context }) => guardPage(context.queryClient, '/reports'),
  component: ReportsRoute
})
