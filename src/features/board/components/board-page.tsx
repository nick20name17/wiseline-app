import { usePageHeader } from '@/components/layout/page-header-context'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { countsQuery, cutlistsQuery } from '../api'
import { canAccess, defaultView, VIEW_LABELS, viewsFor, type BoardView } from '../lib/views'
import { useBoard } from '../lib/board-context'
import { CalendarTab } from './calendar-tab'
import { CoilsTab } from './coils-tab'
import { CompletedTab } from './completed-tab'
import { DeptBar } from './dept-bar'
import { PackagingTab } from './packaging-tab'
import { ProductionTab } from './production-tab'
import { ScheduledTab } from './scheduled-tab'
import { BoardSearch } from './board-search'
import { UnscheduledTab } from './unscheduled-tab'

type BoardPageProps = {
  view: BoardView
  search: string | undefined
  departmentId: number
  /** The viewer's role inside the department, settled before the board mounts — see `BoardGate`. */
  role: 'manager' | 'worker'
  onViewChange: (view: BoardView) => void
  onSearchChange: (search: string | undefined) => void
}

export const BoardPage = ({
  view,
  search,
  departmentId,
  role,
  onViewChange,
  onSearchChange
}: BoardPageProps) => {
  // A Worker works the floor tabs as fully as a Manager; what he cannot reach is kept off the strip.
  const board = useBoard()
  const worker = role === 'worker'
  // The Calendar hands the Scheduled tab a day to open on; going through the strip drops it.
  const [openDay, setOpenDay] = useState<string>()

  // The strip counts the whole board, not what the search has narrowed it to — a Worker too, whose
  // Coils tab reads its figure from the same call.
  const { data: counts } = useQuery(countsQuery(departmentId))
  const coils = counts?.coils ?? undefined
  // Production counts the list its tab opens on — the Slinet's active cutlists — so a cutlist written
  // shows on the strip at once.
  const { data: cutlists } = useQuery(cutlistsQuery(departmentId, 'cutlist', null, false))

  usePageHeader({
    trail: [VIEW_LABELS[view]],
    search: <BoardSearch initial={search} onSearchChange={onSearchChange} />
  })

  // A role that cannot see the tab in the URL is moved to the first one it can.
  useEffect(() => {
    if (!canAccess(board, view, role)) onViewChange(defaultView(board, role))
  }, [board, role, view, onViewChange])

  return (
    // `flex-1` down to the tab, so an empty tab centres its message in the page, not under the tabs.
    <section className='flex min-w-0 flex-1 flex-col gap-4'>
      <DeptBar
        views={viewsFor(board, role)}
        view={view}
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
      ) : view === 'packaging' ? (
        <PackagingTab departmentId={departmentId} />
      ) : (
        <ProductionTab departmentId={departmentId} onOpenCoils={() => onViewChange('coils')} />
      )}
    </section>
  )
}
