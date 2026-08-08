import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar, Topbar } from '@/components/shell/chrome'
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
import { DEPARTMENT, rollformingStore, setSearch } from '@/features/rollforming/store'

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
  // one call per value: a selector that builds an object returns a new snapshot every render
  const searchTerm = useStore(rollformingStore, state => state.searchTerm)
  const activeGroup = useStore(rollformingStore, state => state.activeGroup)
  const expandedCoilsFolder = useStore(rollformingStore, state => state.expandedCoilsFolder)
  const coils = useStore(rollformingStore, state => state.coils)
  const viewer = useViewer()

  const counts: Record<View, number> = {
    home: unscheduledOrders().filter(order => orderInGroup(order, activeGroup)).length,
    scheduled: scheduledOrdersActive().filter(order => orderInGroup(order, activeGroup)).length,
    production: releasedOrders().filter(
      order => orderInGroup(order, activeGroup) && !isDoneInProduction(order)
    ).length,
    queue: queueGroupsSorted().reduce((total, bucket) => total + bucket.rows.length, 0),
    coils: coils.filter(coil => coil.group === expandedCoilsFolder).length,
    wrapping: releasedOrders().filter(
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
      <Toast />
    </>
  )
}
