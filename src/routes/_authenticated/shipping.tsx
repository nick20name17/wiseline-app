import { createFileRoute } from '@tanstack/react-router'
import { Construction, MessageSquare, Search } from 'lucide-react'
import * as z from 'zod'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'
import { Toast } from '@/components/shell/toast'

import { DeptBar } from '@/features/shipping/components/shell'
import { Loading } from '@/features/shipping/components/loading'
import { ShipMap } from '@/features/shipping/components/map'
import { Scheduled } from '@/features/shipping/components/scheduled'
import { Unscheduled } from '@/features/shipping/components/unscheduled'
import { NoteModal } from '@/features/shipping/components/note-modal'
import { TruckNotesModal } from '@/features/shipping/components/truck-notes'
import { loadingLoads, scheduledOrders, unscheduledOrders } from '@/features/shipping/selectors'
import { setSearch, shippingStore, toggleNotesExpanded } from '@/features/shipping/store'
import { closeOrderNotes, closeTruckNotes, shippingUi } from '@/features/shipping/ui'
import { useTableShadows } from '@/features/shipping/use-table-shadows'

import '@/styles/shipping.css'

/** The prototype's five `.view` sections become one search param — see the note on Trim's route. */
const ViewSchema = z.enum(['unscheduled', 'scheduled', 'accessories', 'loading', 'map'])
type View = z.infer<typeof ViewSchema>

const VIEW_LABELS: Record<View, string> = {
  unscheduled: 'Unscheduled',
  scheduled: 'Scheduled',
  accessories: 'Accessories',
  loading: 'Loading',
  map: 'Map'
}

export const Route = createFileRoute('/_authenticated/shipping')({
  validateSearch: z.object({ view: ViewSchema.default('unscheduled') }),
  component: Shipping
})

/**
 * Shipping's top bar carries one control the other departments do not: Toggle Notes, which shows the
 * last note under every order that has one, in every view at once. It is a whole extra button, so this
 * page writes its own top bar rather than adding a slot to the shared one for a single page's sake.
 */
const Topbar = ({ tab, search, notesOn }: { tab: string; search: string; notesOn: boolean }) => (
  <header className='topbar' data-comment='topbar'>
    <div className='crumb' data-comment='topbar-crumb'>
      <strong data-comment='topbar-crumb-dept'>Shipping</strong>
      <span className='crumb-sep' data-comment='topbar-crumb-sep'>
        /
      </span>
      <span data-comment='topbar-crumb-tab' id='crumb-tab'>
        {tab}
      </span>
    </div>
    <div className='search' data-comment='topbar-search'>
      <Search style={{ width: '14px', height: '14px' }} />
      <input
        type='text'
        placeholder='Search orders, customers, addresses…'
        data-comment='topbar-search-input'
        aria-label='Search orders, customers, addresses'
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
    </div>
    <div className='topbar-right' data-comment='topbar-right'>
      <button
        className={`btn btn-sm${notesOn ? ' is-on' : ''}`}
        data-comment='topbar-togglenotes'
        onClick={toggleNotesExpanded}
      >
        <MessageSquare style={{ width: '14px', height: '14px' }} />
        Toggle Notes
      </button>
      <div className='avatar' data-comment='topbar-avatar' title='John Enns'>
        JE
      </div>
    </div>
  </header>
)

function Shipping() {
  usePage('shipping')
  useTableShadows()

  const { view } = Route.useSearch()
  const navigate = Route.useNavigate()
  // the tab counts read most of the board, so this one subscribes to all of it
  const state = useStore(shippingStore, current => current)
  const ui = useStore(shippingUi, current => current)
  const viewer = useViewer()

  const go = (next: string) =>
    void navigate({ search: { view: ViewSchema.catch('unscheduled').parse(next) } })

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/shipping'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <Topbar tab={VIEW_LABELS[view]} search={state.search} notesOn={state.notesExpanded} />
          <DeptBar
            tabs={[
              {
                view: 'unscheduled',
                label: 'Unscheduled',
                count: unscheduledOrders(state.orders).length
              },
              {
                view: 'scheduled',
                label: 'Scheduled',
                count: scheduledOrders(state.orders, state.loads).length
              },
              { view: 'accessories', label: 'Accessories' },
              { view: 'loading', label: 'Loading', count: loadingLoads(state.loads).length },
              { view: 'map', label: 'Map' }
            ]}
            activeView={view}
            onNavigate={go}
          />

          <main className='content' data-comment='content'>
            <section id={`view-${view}`} className='view active' data-comment={`view-${view}`}>
              {view === 'unscheduled' ? <Unscheduled /> : null}
              {view === 'scheduled' ? <Scheduled /> : null}
              {view === 'loading' ? <Loading /> : null}
              {view === 'map' ? <ShipMap /> : null}
              {/* the prototype ships this tab unbuilt, and says so in the page rather than hiding it */}
              {view === 'accessories' ? (
                <div
                  className='empty'
                  data-comment='acc-wip'
                  style={{ padding: '64px 12px', textAlign: 'center' }}
                >
                  <Construction data-comment='acc-wip-icon' className='empty-ico' />
                  <h3 data-comment='acc-wip-title'>Work in progress</h3>
                  <p data-comment='acc-wip-text'>This tab is still being built.</p>
                </div>
              ) : null}
            </section>
          </main>
        </div>
      </div>
      <NoteModal orderId={ui.note} onClose={closeOrderNotes} />
      <TruckNotesModal open={ui.truckNotes} onClose={closeTruckNotes} />
      <Toast message={ui.toast.message} type={ui.toast.type} shown={ui.toast.shown} />
    </>
  )
}
