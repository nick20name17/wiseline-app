import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar, Topbar } from '@/components/shell/chrome'
import { AlertOverlay, ConfirmOverlay } from '@/components/shell/modal'
import { Toast } from '@/components/shell/toast'

import { DeptBar } from '@/features/rollforming/components/shell'
import { Coils } from '@/features/rollforming/components/coils'
import { Completed } from '@/features/rollforming/components/completed'
import { Production } from '@/features/rollforming/components/production'
import { Queue } from '@/features/rollforming/components/queue'
import { Scheduled } from '@/features/rollforming/components/scheduled'
import { Unscheduled } from '@/features/rollforming/components/unscheduled'
import { Wrapping } from '@/features/rollforming/components/wrapping'
import {
  isDoneInProduction,
  isFullyWrapped,
  orderInGroup,
  queueGroupsSorted,
  releasedOrders,
  scheduledOrdersActive,
  unscheduledOrders
} from '@/features/rollforming/selectors'
import { AssignModal } from '@/features/rollforming/components/assign'
import { CoilPickModal } from '@/features/rollforming/components/coil-pick'
import { RfKeypad } from '@/features/rollforming/components/keypad'
import { CalendarModal } from '@/features/rollforming/components/calendar-modal'
import { LocationPicker } from '@/features/rollforming/components/location-picker'
import { LotPickModal } from '@/features/rollforming/components/lot-pick'
import { PackageModal } from '@/features/rollforming/components/package-modal'
import { SeePackagesModal } from '@/features/rollforming/components/see-packages'
import { MaterialRequestModal } from '@/features/rollforming/components/material-request'
import { NoteModal } from '@/features/rollforming/components/note-modal'
import { DEPARTMENT, rollformingStore, setSearch } from '@/features/rollforming/store'
import {
  closeAlert,
  closeAssign,
  closeCoilPick,
  closeConfirm,
  closeLocationPicker,
  closeLotPick,
  closeMaterialRequest,
  closePackage,
  closeSchedule,
  closeSeePackages,
  closeNotes,
  rollformingUi
} from '@/features/rollforming/ui'

import '@/styles/rollforming.css'

/** The prototype's seven `.view` sections become one search param — see the note on Trim's route. */
const ViewSchema = z.enum([
  'home',
  'scheduled',
  'production',
  'queue',
  'coils',
  'wrapping',
  'completed'
])
type View = z.infer<typeof ViewSchema>

const VIEW_LABELS: Record<View, string> = {
  home: 'Unscheduled',
  scheduled: 'Scheduled',
  production: 'Production',
  queue: 'Queue',
  coils: 'Coils',
  wrapping: 'Wrapping',
  completed: 'Completed'
}

/** Completed is reached from the header link, not the tab strip, so it is not one of these. */
const TABS: View[] = ['home', 'scheduled', 'production', 'queue', 'coils', 'wrapping']

export const Route = createFileRoute('/_authenticated/rollforming')({
  validateSearch: z.object({ view: ViewSchema.default('home') }),
  component: Rollforming
})

function Rollforming() {
  usePage('rollforming')

  const { view } = Route.useSearch()
  const navigate = Route.useNavigate()
  // the counts read most of the board, so this one subscribes to all of it
  const state = useStore(rollformingStore, current => current)
  const { searchTerm, activeGroup, expandedCoilsFolder, coils } = state
  const viewer = useViewer()
  const ui = useStore(rollformingUi, current => current)

  const counts: Record<View, number> = {
    home: unscheduledOrders(state.orders).filter(order => orderInGroup(order, activeGroup)).length,
    scheduled: scheduledOrdersActive(state.orders).filter(order => orderInGroup(order, activeGroup))
      .length,
    production: releasedOrders(state.orders).filter(
      order => orderInGroup(order, activeGroup) && !isDoneInProduction(order)
    ).length,
    queue: queueGroupsSorted(undefined, state).reduce(
      (total, bucket) => total + bucket.rows.length,
      0
    ),
    coils: coils.filter(coil => coil.group === expandedCoilsFolder).length,
    wrapping: releasedOrders(state.orders).filter(
      order => orderInGroup(order, activeGroup) && !isFullyWrapped(order) && order.packages.length
    ).length,
    completed: 0
  }

  const go = (next: string) =>
    void navigate({ search: { view: ViewSchema.catch('home').parse(next) } })

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/rollforming'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <Topbar
            department={DEPARTMENT}
            tab={VIEW_LABELS[view]}
            search={searchTerm}
            placeholder='Search orders, profiles, customers'
            onSearch={setSearch}
          />
          <DeptBar
            tabs={TABS.map(tab => ({
              view: tab,
              label: VIEW_LABELS[tab],
              count: counts[tab]
            }))}
            activeView={view}
            onNavigate={go}
          />

          <main className='content' data-comment='content'>
            <section id={`view-${view}`} className='view active' data-comment={`view-${view}`}>
              {view === 'home' ? <Unscheduled /> : null}
              {view === 'scheduled' ? <Scheduled /> : null}
              {view === 'production' ? <Production /> : null}
              {view === 'queue' ? <Queue /> : null}
              {view === 'coils' ? <Coils /> : null}
              {view === 'wrapping' ? <Wrapping /> : null}
              {view === 'completed' ? <Completed /> : null}
            </section>
          </main>
        </div>
      </div>
      <NoteModal ctx={ui.note} onClose={closeNotes} />
      <MaterialRequestModal open={ui.mreq} onClose={closeMaterialRequest} />
      {/* keyed per opening: the form's fields start from the unit that was picked */}
      <AssignModal
        key={
          ui.assign
            ? `${ui.assign.orderId}:${ui.assign.units
                .map(unit => `${unit.lineId}.${unit.coilIdx}`)
                .join(',')}`
            : 'assign'
        }
        ctx={ui.assign}
        onClose={closeAssign}
      />
      <CoilPickModal ctx={ui.coilPick} onClose={closeCoilPick} />
      <LotPickModal ctx={ui.lotPick} onClose={closeLotPick} />
      <PackageModal orderId={ui.pkg} onClose={closePackage} />
      <SeePackagesModal orderId={ui.seePkg} onClose={closeSeePackages} />
      <LocationPicker ctx={ui.loc} onClose={closeLocationPicker} />
      {/* keyed per opening: a reschedule starts on the day the order already has */}
      <CalendarModal
        key={ui.schedule ? `${ui.schedule.mode}-${JSON.stringify(ui.schedule)}` : 'cal'}
        ctx={ui.schedule}
        onClose={closeSchedule}
      />
      {/* keyed per opening, so the pad starts on the value the row already carries */}
      <RfKeypad key={ui.pad ? `${ui.pad.kind}-${ui.pad.lineId}` : 'kp'} ctx={ui.pad} />
      <ConfirmOverlay confirm={ui.confirm} onClose={closeConfirm} />
      <AlertOverlay alert={ui.alert} onClose={closeAlert} />
      <Toast message={ui.toast.message} type={ui.toast.type} shown={ui.toast.shown} />
    </>
  )
}
