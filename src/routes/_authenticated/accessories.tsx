import { useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

import { useDeptRole } from '@/session/dept-role'
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
import { canAccess, defaultView, DeptBar } from '@/features/accessories/components/shell'
import { Unscheduled } from '@/features/accessories/components/unscheduled'
import {
  completedOrdersList,
  dueForRelease,
  scheduledOrders,
  unscheduledOrders
} from '@/features/accessories/selectors'
import { CalendarModal } from '@/features/accessories/components/calendar-modal'
import { LocationPicker } from '@/features/accessories/components/location-picker'
import { NoteModal } from '@/features/accessories/components/note-modal'
import { PackagesModal } from '@/features/accessories/components/packages-modal'
import {
  accessoriesStore,
  DEPARTMENT,
  removeLocation,
  setDeptRole,
  setSearch
} from '@/features/accessories/store'
import {
  accessoriesUi,
  closeAlert,
  closeConfirm,
  closeLocationPicker,
  closeNotes,
  closePackages,
  closeSchedule,
  showToast
} from '@/features/accessories/ui'

import { RELEASE_CHECK_MS } from '@/features/accessories/use-now'

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
  useDeptRole(setDeptRole)

  const { view } = Route.useSearch()
  const navigate = Route.useNavigate()
  // the tab counts read the whole board, so this one subscribes to all of it
  const state = useStore(accessoriesStore, current => current)
  const ui = useStore(accessoriesUi, current => current)
  const viewer = useViewer()

  // the role changing can strand the viewer on a tab it no longer sees — as on Trim and Rollforming
  const applied = useRef<string | null>(null)
  useEffect(() => {
    if (applied.current === state.role) return
    applied.current = state.role
    if (!canAccess(view, state.role))
      void navigate({ search: { view: defaultView(state.role) as View } })
  }, [state.role, view, navigate])

  // Packaging lists the same scheduled orders the Scheduled tab groups by day, so both counts are one
  const counts: Record<View, number> = {
    unscheduled: unscheduledOrders(state.orders).length,
    scheduled: scheduledOrders(state.orders).length,
    packaging: scheduledOrders(state.orders).length,
    completed: completedOrdersList(state.orders).length
  }

  // the release is real elapsed time, so it has to fire on its own rather than on the next click
  useEffect(() => {
    const timer = setInterval(() => {
      for (const { locationId, orderId, code } of dueForRelease()) {
        removeLocation(orderId, locationId)
        showToast(`Location ${code} auto-released — 15 min since last scan`)
      }
    }, RELEASE_CHECK_MS)

    return () => clearInterval(timer)
  }, [])

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
            role={state.role}
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
      {/* keyed per opening: the grid starts on Warehouse #1 / Accessories every time */}
      <LocationPicker
        key={`loc-${ui.locPicker ?? 'none'}`}
        orderId={ui.locPicker}
        onClose={closeLocationPicker}
      />
      <PackagesModal orderId={ui.packages} onClose={closePackages} />
      <ConfirmOverlay confirm={ui.confirm} onClose={closeConfirm} />
      <AlertOverlay alert={ui.alert} onClose={closeAlert} />
      <Toast message={ui.toast.message} type={ui.toast.type} shown={ui.toast.shown} />
    </>
  )
}
