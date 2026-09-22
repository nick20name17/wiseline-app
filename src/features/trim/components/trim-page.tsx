import { usePageHeader } from '@/components/layout/page-header-context'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  cutlistsQuery,
  scheduledOrdersQuery,
  unscheduledOrdersQuery,
  useTrimCoils,
  useTrimDepartment
} from '../api'
import { canAccess, defaultView, VIEW_LABELS, type TrimView } from '../lib/views'
import { CalendarTab } from './calendar-tab'
import { CoilsTab } from './coils-tab'
import { CompletedTab } from './completed-tab'
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
  // A Worker works the floor tabs as fully as a Manager; what he cannot reach is kept off the strip.
  const worker = role === 'worker'
  // The Calendar hands the Scheduled tab a day to open on; going through the strip drops it.
  const [openDay, setOpenDay] = useState<string>()

  // The strip counts the whole board, not what the search has narrowed it to, and reads the server's
  // total rather than the length of one page. A Worker has no order tabs, so their lists stay unasked.
  const { data: unscheduled } = useQuery({ ...unscheduledOrdersQuery(undefined), enabled: !worker })
  const { data: scheduled } = useQuery({
    ...scheduledOrdersQuery(undefined, null),
    enabled: !worker
  })
  // The same lists Production and Coils open on: the Slinet's active cutlists, and Trim's coils.
  const { data: cutlists } = useQuery(cutlistsQuery(department?.id, 'cutlist', null, false))
  const { trimLots } = useTrimCoils(department?.id)

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
        counts={{
          unscheduled: unscheduled?.count,
          scheduled: scheduled?.count,
          production: cutlists?.length,
          coils: trimLots?.length
        }}
        onNavigate={next => {
          setOpenDay(undefined)
          onViewChange(next)
        }}
      />

      {view === 'unscheduled' ? (
        <UnscheduledTab search={search} departmentId={department?.id} />
      ) : view === 'scheduled' ? (
        <ScheduledTab search={search} departmentId={department?.id} initialDay={openDay} />
      ) : view === 'coils' ? (
        <CoilsTab departmentId={department?.id} worker={worker} />
      ) : view === 'calendar' ? (
        <CalendarTab
          departmentId={department?.id}
          // A day leads back to the board: the calendar reads the month, the Scheduled tab works it.
          onOpenDay={day => {
            setOpenDay(day)
            onViewChange('scheduled')
          }}
        />
      ) : view === 'completed' ? (
        <CompletedTab departmentId={department?.id} />
      ) : (
        <ProductionTab departmentId={department?.id} onOpenCoils={() => onViewChange('coils')} />
      )}
    </section>
  )
}
