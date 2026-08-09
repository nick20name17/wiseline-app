import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar, Topbar } from '@/components/shell/chrome'
import { AlertOverlay, ConfirmOverlay } from '@/components/shell/modal'
import { Toast } from '@/components/shell/toast'

import { DeptBar } from '@/features/trim/components/shell'
import { Calendar } from '@/features/trim/components/calendar'
import { Keypads } from '@/features/trim/components/keypads'
import { CutlistCoils } from '@/features/trim/components/cutlist-coils'
import { CutlistTotal } from '@/features/trim/components/cutlist-total'
import { AllocStock } from '@/features/trim/components/alloc-stock'
import { MachineCap } from '@/features/trim/components/machine-cap'
import { StockCardsModal } from '@/features/trim/components/stock-cards-modal'
import { StockOrderModal } from '@/features/trim/components/stock-order-modal'
import { LocationPicker } from '@/features/trim/components/location-picker'
import { PackagesModal } from '@/features/trim/components/packages-modal'
import { NoteModal } from '@/features/trim/components/note-modal'
import { ScheduleModal } from '@/features/trim/components/schedule-modal'
import { Coils } from '@/features/trim/components/coils'
import { Completed } from '@/features/trim/components/completed'
import { Production } from '@/features/trim/components/production'
import { Scheduled } from '@/features/trim/components/scheduled'
import { Unscheduled } from '@/features/trim/components/unscheduled'
import { fmtDate } from '@/features/trim/format'
import { scheduledOrders, unscheduledOrders } from '@/features/trim/selectors'
import {
  DEPARTMENT,
  rescheduleOrder,
  scheduleLines,
  scheduleOrders,
  setPeekDay,
  setScheduledDay,
  setSearch,
  trimStore
} from '@/features/trim/store'
import {
  closeAlert,
  closeAllocStock,
  closeConfirm,
  closeCutlistCoils,
  closeCutlistTotal,
  closeLocPicker,
  closeMachineCap,
  closeNotes,
  closePackages,
  closeSchedule,
  closeStockCards,
  closeStockOrder,
  confirmUnschedule,
  pickLocation,
  showToast,
  trimUi
} from '@/features/trim/ui'

import '@/styles/home.css'

/**
 * The prototype's six `.view` sections become one search param.
 *
 * They are not routes: the views share a store, a scroll position and a selection, and the prototype
 * treats moving between them as changing a tab rather than leaving the page. A search param says the
 * same thing the `id` of the visible section said, and keeps a comment's route readable — a thread
 * written on Production carries `?view=production` and comes back to Production.
 */
const ViewSchema = z.enum(['home', 'scheduled', 'production', 'coils', 'calendar', 'completed'])
type View = z.infer<typeof ViewSchema>

const TAB_LABELS: Record<View, string> = {
  home: 'Unscheduled',
  scheduled: 'Scheduled',
  production: 'Production',
  coils: 'Coils',
  calendar: 'Calendar',
  completed: 'Completed'
}

export const Route = createFileRoute('/_authenticated/trim')({
  validateSearch: z.object({ view: ViewSchema.default('home') }),
  component: Trim
})

function Trim() {
  usePage('home')

  const { view } = Route.useSearch()
  const navigate = Route.useNavigate()
  // one call per value: a selector that builds an object returns a new snapshot every render, and
  // `useSyncExternalStore` reads that as "changed" forever
  const searchTerm = useStore(trimStore, state => state.searchTerm)
  // the tab counts are derived from the orders, so the header has to hear about a scheduling change
  const orders = useStore(trimStore, state => state.orders)
  const ui = useStore(trimUi, current => current)
  const viewer = useViewer()
  const cutlists = useStore(trimStore, state => (state.cutlists as unknown[]).length)
  const coils = useStore(trimStore, state => (state.coils as unknown[]).length)

  const tabs = [
    {
      view: 'home',
      comment: 'tab-unscheduled',
      label: 'Unscheduled',
      count: unscheduledOrders(orders).length
    },
    {
      view: 'scheduled',
      comment: 'tab-scheduled',
      label: 'Scheduled',
      count: scheduledOrders(orders).length
    },
    { view: 'production', comment: 'tab-production', label: 'Production', count: cutlists },
    { view: 'coils', comment: 'tab-coils', label: 'Coils', count: coils },
    { view: 'calendar', comment: 'tab-calendar', label: 'Calendar' }
  ]

  const go = (next: string) =>
    void navigate({ search: { view: ViewSchema.catch('home').parse(next) } })

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/trim'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <Topbar
            department={DEPARTMENT}
            tab={TAB_LABELS[view]}
            search={searchTerm}
            placeholder='Search orders, customers, product IDs'
            onSearch={setSearch}
          />
          <DeptBar title={DEPARTMENT} code='01' tabs={tabs} activeView={view} onNavigate={go} />

          <main className='content' data-comment='content'>
            <section id={`view-${view}`} className='view active' data-comment={`view-${view}`}>
              {view === 'home' ? <Unscheduled /> : null}
              {view === 'scheduled' ? <Scheduled /> : null}
              {view === 'production' ? <Production /> : null}
              {view === 'coils' ? <Coils /> : null}
              {view === 'calendar' ? <Calendar /> : null}
              {view === 'completed' ? <Completed /> : null}
            </section>
          </main>
        </div>
      </div>

      <ScheduleModal
        key={ui.schedule ? `${ui.schedule.mode}-${JSON.stringify(ui.schedule)}` : 'schedule-closed'}
        ctx={ui.schedule}
        onClose={closeSchedule}
        onUnschedule={orderId => {
          const order = trimStore.get().orders.find(entry => entry.id === orderId)
          if (order) confirmUnschedule(order.id, order.order)
        }}
        onPick={(ctx, iso) => {
          if (ctx.mode === 'jump') setScheduledDay(iso)
          else if (ctx.mode === 'peek') setPeekDay(iso)
          else if (ctx.mode === 'reschedule') {
            rescheduleOrder(ctx.orderId, iso)
            showToast(`Rescheduled to ${fmtDate(iso)} — Manager edits reset`)
          } else if (ctx.mode === 'entire') {
            scheduleOrders(ctx.orderIds, iso)
            showToast(`Scheduled to ${fmtDate(iso)}`)
          } else {
            scheduleLines(ctx.orderId, ctx.lineIds, iso)
            showToast(`Scheduled to ${fmtDate(iso)}`)
          }
          closeSchedule()
        }}
      />
      <NoteModal ctx={ui.note} onClose={closeNotes} />
      <Keypads />
      <LocationPicker
        orderId={ui.locPicker?.orderId ?? null}
        stagedWeight={ui.locPicker?.stagedWeight ?? 0}
        onClose={closeLocPicker}
        onPick={locationId => {
          const order = trimStore.get().orders.find(entry => entry.id === ui.locPicker?.orderId)
          const location = trimStore.get().locations.find(entry => entry.id === locationId)
          if (order && location) pickLocation(order, locationId, location.code)
        }}
      />
      <PackagesModal orderId={ui.packages} onClose={closePackages} />
      <CutlistCoils gaugeColour={ui.cutlistCoils} onClose={closeCutlistCoils} />
      <CutlistTotal items={ui.cutlistTotal} onClose={closeCutlistTotal} />
      <MachineCap day={ui.machineCap} onClose={closeMachineCap} />
      <AllocStock open={ui.allocStock} onClose={closeAllocStock} />
      <StockCardsModal open={ui.stockCards} onClose={closeStockCards} />
      <StockOrderModal open={ui.stockOrder} onClose={closeStockOrder} />
      <ConfirmOverlay confirm={ui.confirm} onClose={closeConfirm} />
      <AlertOverlay alert={ui.alert} onClose={closeAlert} />
      <Toast message={ui.toast.message} type={ui.toast.type} shown={ui.toast.shown} />
    </>
  )
}
