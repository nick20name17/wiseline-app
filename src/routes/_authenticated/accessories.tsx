import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar, Topbar } from '@/components/shell/chrome'
import { AlertOverlay, ConfirmOverlay } from '@/components/shell/modal'
import { Toast } from '@/components/shell/toast'

import { Completed } from '@/features/accessories/components/completed'
import { Packaging } from '@/features/accessories/components/packaging'
import { Scheduled } from '@/features/accessories/components/scheduled'
import { DeptBar } from '@/features/accessories/components/shell'
import { Unscheduled } from '@/features/accessories/components/unscheduled'
import {
  completedOrdersList,
  scheduledOrders,
  unscheduledOrders
} from '@/features/accessories/selectors'
import { CalendarModal } from '@/features/accessories/components/calendar-modal'
import { NoteModal } from '@/features/accessories/components/note-modal'
import { accessoriesStore, DEPARTMENT, setSearch } from '@/features/accessories/store'
import {
  accessoriesUi,
  closeAlert,
  closeConfirm,
  closeNotes,
  closeSchedule
} from '@/features/accessories/ui'

import '@/styles/accessories.css'

/** The prototype's four `.view` sections become one search param — see the note on Trim's route. */
const ViewSchema = z.enum(['unscheduled', 'scheduled', 'packaging', 'completed'])
type View = z.infer<typeof ViewSchema>

const VIEW_LABELS: Record<View, string> = {
  unscheduled: 'Unscheduled',
  scheduled: 'Scheduled',
  packaging: 'Packaging',
  completed: 'Completed Orders'
}

const TABS: View[] = ['unscheduled', 'scheduled', 'packaging', 'completed']

export const Route = createFileRoute('/_authenticated/accessories')({
  validateSearch: z.object({ view: ViewSchema.default('unscheduled') }),
  component: Accessories
})

function Accessories() {
  usePage('accessories')

  const { view } = Route.useSearch()
  const navigate = Route.useNavigate()
  // the tab counts read the whole board, so this one subscribes to all of it
  const state = useStore(accessoriesStore, current => current)
  const ui = useStore(accessoriesUi, current => current)
  const viewer = useViewer()

  // Packaging lists the same scheduled orders the Scheduled tab groups by day, so both counts are one
  const counts: Record<View, number> = {
    unscheduled: unscheduledOrders(state.orders).length,
    scheduled: scheduledOrders(state.orders).length,
    packaging: scheduledOrders(state.orders).length,
    completed: completedOrdersList(state.orders).length
  }

  const go = (next: string) =>
    void navigate({ search: { view: ViewSchema.catch('unscheduled').parse(next) } })

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/accessories'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <Topbar
            department={DEPARTMENT}
            tab={VIEW_LABELS[view]}
            search={state.search}
            placeholder='Search orders, customers'
            onSearch={setSearch}
          />
          <DeptBar
            tabs={TABS.map(tab => ({ view: tab, label: VIEW_LABELS[tab], count: counts[tab] }))}
            activeView={view}
            onNavigate={go}
          />

          <main className='content' data-comment='content'>
            <section id={`view-${view}`} className='view active' data-comment={`view-${view}`}>
              {view === 'unscheduled' ? <Unscheduled /> : null}
              {view === 'scheduled' ? <Scheduled /> : null}
              {view === 'packaging' ? <Packaging /> : null}
              {view === 'completed' ? <Completed /> : null}
            </section>
          </main>
        </div>
      </div>
      <NoteModal ctx={ui.note} onClose={closeNotes} />
      {/* keyed per opening: a reschedule starts on the day the order already has */}
      <CalendarModal
        key={ui.schedule ? JSON.stringify(ui.schedule) : 'cal'}
        ctx={ui.schedule}
        onClose={closeSchedule}
      />
      <ConfirmOverlay confirm={ui.confirm} onClose={closeConfirm} />
      <AlertOverlay alert={ui.alert} onClose={closeAlert} />
      <Toast message={ui.toast.message} type={ui.toast.type} shown={ui.toast.shown} />
    </>
  )
}
