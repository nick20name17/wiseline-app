import { usePageHeader } from '@/components/layout/page-header-context'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { countsQuery, cutlistsQuery, departmentCoilLotsQuery } from '../api'
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
  departmentId: number
  /** The viewer's role inside Trim, settled before the board mounts — see `TrimGate`. */
  role: 'manager' | 'worker'
  onViewChange: (view: TrimView) => void
  onSearchChange: (search: string | undefined) => void
}

export const TrimPage = ({
  view,
  search,
  departmentId,
  role,
  onViewChange,
  onSearchChange
}: TrimPageProps) => {
  // A Worker works the floor tabs as fully as a Manager; what he cannot reach is kept off the strip.
  const worker = role === 'worker'
  // The Calendar hands the Scheduled tab a day to open on; going through the strip drops it.
  const [openDay, setOpenDay] = useState<string>()

  // The strip counts the whole board, not what the search has narrowed it to. A Worker has no order
  // tabs, so the counts stay unasked.
  const { data: counts } = useQuery({ ...countsQuery(departmentId), enabled: !worker })
  // Production and Coils count the very lists their tabs open on — the Slinet's active cutlists, and
  // the coils Trim's filter admits — so a cutlist written or a coil moved shows on the strip at once.
  const { data: cutlists } = useQuery(cutlistsQuery(departmentId, 'cutlist', null, false))
  const { data: coils } = useQuery({
    ...departmentCoilLotsQuery(departmentId),
    select: lots => lots.length
  })

  usePageHeader({
    trail: [VIEW_LABELS[view]],
    search: <TrimSearch initial={search} onSearchChange={onSearchChange} />
  })

  // A role that cannot see the tab in the URL is moved to the first one it can.
  useEffect(() => {
    if (!canAccess(view, role)) onViewChange(defaultView(role))
  }, [role, view, onViewChange])

  return (
    // `flex-1` down to the tab, so an empty tab centres its message in the page, not under the tabs.
    <section className='flex min-w-0 flex-1 flex-col gap-4'>
      <DeptBar
        view={view}
        role={role}
        counts={{
          unscheduled: counts?.unscheduled,
          scheduled: counts?.scheduled,
          production: cutlists?.length,
          coils
        }}
        onNavigate={next => {
          setOpenDay(undefined)
          onViewChange(next)
        }}
      />

      {view === 'unscheduled' ? (
        <UnscheduledTab search={search} departmentId={departmentId} />
      ) : view === 'scheduled' ? (
        <ScheduledTab search={search} departmentId={departmentId} initialDay={openDay} />
      ) : view === 'coils' ? (
        <CoilsTab departmentId={departmentId} worker={worker} />
      ) : view === 'calendar' ? (
        <CalendarTab
          departmentId={departmentId}
          // A day leads back to the board: the calendar reads the month, the Scheduled tab works it.
          onOpenDay={day => {
            setOpenDay(day)
            onViewChange('scheduled')
          }}
        />
      ) : view === 'completed' ? (
        <CompletedTab departmentId={departmentId} />
      ) : (
        <ProductionTab departmentId={departmentId} onOpenCoils={() => onViewChange('coils')} />
      )}
    </section>
  )
}
