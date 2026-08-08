import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { DeptBar, Sidebar, Topbar } from '@/features/trim/components/shell'
import { Toast } from '@/features/trim/components/toast'
import { Unscheduled } from '@/features/trim/components/unscheduled'
import { scheduledOrders, unscheduledOrders } from '@/features/trim/selectors'
import { DEPARTMENT, setSearch, trimStore } from '@/features/trim/store'

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
  const viewer = useViewer()
  const cutlists = useStore(trimStore, state => (state.cutlists as unknown[]).length)
  const coils = useStore(trimStore, state => (state.coils as unknown[]).length)

  const tabs = [
    {
      view: 'home',
      comment: 'tab-unscheduled',
      label: 'Unscheduled',
      count: unscheduledOrders().length
    },
    {
      view: 'scheduled',
      comment: 'tab-scheduled',
      label: 'Scheduled',
      count: scheduledOrders().length
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
            onSearch={setSearch}
          />
          <DeptBar title={DEPARTMENT} code='01' tabs={tabs} activeView={view} onNavigate={go} />

          <main className='content' data-comment='content'>
            <section id={`view-${view}`} className='view active' data-comment={`view-${view}`}>
              {view === 'home' ? <Unscheduled /> : null}
            </section>
          </main>
        </div>
      </div>
      <Toast />
    </>
  )
}
