import { usePageHeader } from '@/components/layout/page-header-context'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { countsQuery, cutlistsQuery, machinesQuery } from '../api'
import { machineTabsOf, type MachineTab } from '../lib/machines'
import { canAccess, defaultView, VIEW_LABELS, viewsFor } from '../lib/views'
import type { BoardView } from '../lib/boards'
import { useBoard } from '../lib/board-context'
import { CalendarTab } from './calendar-tab'
import { CoilsTab } from './coils-tab'
import { CompletedTab } from './completed-tab'
import { DeptBar } from './dept-bar'
import { MachineStrip } from './machine-strip'
import { PackagingTab } from './packaging-tab'
import { QueueTab } from './queue-tab'
import { RollformingProductionTab } from './rollforming-production-tab'
import { ProductionTab } from './production-tab'
import { ScanPackageDialog } from './scan-package-dialog'
import { ScheduledTab } from './scheduled-tab'
import { HeaderSearch } from '@/components/header-search'
import { SlitLineTab } from './slit-line-tab'
import { UnscheduledTab } from './unscheduled-tab'
import { WrappingTab } from './wrapping-tab'

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
  const { data: cutlists } = useQuery({
    ...cutlistsQuery(departmentId, 'cutlist', null, false),
    enabled: board.managerViews.includes('production') && !board.machineTabs
  })

  // The machine tab outlives the working tab, as a second row does on the board p2 (542,280).
  const { data: allMachines } = useQuery({
    ...machinesQuery(board.name, departmentId),
    enabled: board.machineTabs
  })
  // The cache is shared with the line items' machine picker, so a board without tabs reads none of it.
  const machines = board.machineTabs ? machineTabsOf(allMachines ?? [], departmentId) : []
  const [picked, setPicked] = useState<MachineTab>()
  const ordersByMachine = view === 'unscheduled' || view === 'scheduled'
  const firstMachine = machines[0]?.id
  const machine = picked ?? firstMachine
  // A machine's own tabs have no «No machine» of theirs; they fall back to the first machine.
  const machineId = typeof machine === 'number' ? machine : firstMachine
  const showStrip =
    board.machineTabs && (ordersByMachine || view === 'production' || view === 'queue')

  usePageHeader({
    trail: [VIEW_LABELS[view]],
    search: <HeaderSearch initial={search} onSearchChange={onSearchChange} />
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
        // The station a label is made at checks one too p2 (980,536), p3 (1216,364); Trim's Wrapping
        // offers it among its machine tabs.
        actions={view === 'wrapping' || view === 'packaging' ? <ScanPackageDialog /> : null}
      />

      {showStrip && machines.length ? (
        <MachineStrip
          machines={machines}
          value={(ordersByMachine ? machine : machineId) ?? 'none'}
          withNone={ordersByMachine}
          onChange={setPicked}
        />
      ) : null}

      {view === 'unscheduled' ? (
        <UnscheduledTab search={search} departmentId={departmentId} machine={machine} />
      ) : view === 'scheduled' ? (
        <ScheduledTab
          search={search}
          departmentId={departmentId}
          initialDay={openDay}
          machine={machine}
        />
      ) : view === 'queue' ? (
        <QueueTab departmentId={departmentId} machineId={machineId} worker={worker} />
      ) : view === 'production' && board.machineTabs ? (
        <RollformingProductionTab
          search={search}
          departmentId={departmentId}
          machineId={machineId}
        />
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
      ) : view === 'slit' ? (
        <SlitLineTab departmentId={departmentId} />
      ) : view === 'wrapping' ? (
        // Rollforming wraps from a tab of its own; Trim's Wrapping sits among its machine tabs.
        <WrappingTab departmentId={departmentId} />
      ) : (
        <ProductionTab departmentId={departmentId} onOpenCoils={() => onViewChange('coils')} />
      )}
    </section>
  )
}
