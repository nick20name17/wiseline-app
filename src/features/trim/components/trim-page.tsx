import { usePageHeader } from '@/components/layout/page-header-context'
import { PagePlaceholder } from '@/components/page-placeholder'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { scheduledOrdersQuery, unscheduledOrdersQuery, useTrimDepartment } from '../api'
import { canAccess, defaultView, VIEW_LABELS, type TrimView } from '../lib/views'
import { DeptBar } from './dept-bar'
import { ProductionTab } from './production-tab'
import { ScheduledTab } from './scheduled-tab'
import { TrimSearch } from './trim-search'
import { UnscheduledTab } from './unscheduled-tab'

type TrimPageProps = {
  view: TrimView
  search: string | undefined
  /** The viewer's role. It comes from the route, which is the layer allowed to reach auth. */
  role: string
  onViewChange: (view: TrimView) => void
  onSearchChange: (search: string | undefined) => void
}

export const TrimPage = ({ view, search, role, onViewChange, onSearchChange }: TrimPageProps) => {
  const { data: department } = useTrimDepartment()
  // A Worker reads the board and works to it, but sets nothing on it.
  const readOnly = role === 'worker'

  // The tab strip's numbers come from the same queries the tabs render, so the two cannot disagree.
  const { data: unscheduled } = useQuery(unscheduledOrdersQuery(search))
  const { data: scheduled } = useQuery(scheduledOrdersQuery(search, null))

  usePageHeader({
    trail: [VIEW_LABELS[view]],
    search: <TrimSearch initial={search} onSearchChange={onSearchChange} />
  })

  // A role that cannot see the tab in the URL is moved to the first one it can.
  useEffect(() => {
    if (role && !canAccess(view, role)) onViewChange(defaultView(role))
  }, [role, view, onViewChange])

  return (
    <section className='flex min-w-0 flex-col gap-4'>
      <DeptBar
        view={view}
        role={role}
        counts={{ unscheduled: unscheduled?.results.length, scheduled: scheduled?.results.length }}
        onNavigate={onViewChange}
      />

      {view === 'unscheduled' ? (
        <UnscheduledTab search={search} departmentId={department?.id} readOnly={readOnly} />
      ) : view === 'scheduled' ? (
        <ScheduledTab search={search} departmentId={department?.id} readOnly={readOnly} />
      ) : view === 'production' ? (
        <ProductionTab
          departmentId={department?.id}
          readOnly={readOnly}
          onOpenCoils={() => onViewChange('coils')}
        />
      ) : (
        <PagePlaceholder title={`Trim · ${VIEW_LABELS[view]}`} />
      )}
    </section>
  )
}
