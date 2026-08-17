import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clock,
  Factory,
  Inbox,
  Info,
  Minus,
  PackagePlus,
  SlidersHorizontal,
  TriangleAlert
} from 'lucide-react'

import { ROLE_LABELS, viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'
import { useColumnOrder, type Column } from '@/components/shell/column-order'
import { Toast } from '@/components/shell/toast'
import { useToast } from '@/components/shell/use-toast'

import { FlowList, IMPORT_ITEMS, LOCAL_ITEMS, WRITEBACK_ITEMS } from '@/features/ebms/flow'
import {
  ebmsStore,
  matchesWbFilter,
  retryWriteback,
  setWbFilter,
  slug,
  STATUS_META,
  TYPE_META,
  WB_FILTERS
} from '@/features/ebms/store'

import '@/styles/ebms.css'

export const Route = createFileRoute('/_authenticated/ebms')({
  component: Ebms
})

const TypeIcon = ({ type }: { type: string }) => {
  if (type === 'Coil LF') return <SlidersHorizontal />
  if (type === 'Stock Mfg') return <PackagePlus />
  return <Factory />
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'Pending') return <Clock />
  if (status === 'Failed') return <TriangleAlert />
  return <Check />
}

/**
 * What crosses the EBMS boundary, in both directions, and what deliberately does not.
 *
 * The three columns are the page's argument: EBMS is read-only on the way in, the way back is
 * field-level PATCH rather than one "order complete" call, and everything the floor invents — notes,
 * priority, machine assignment — stays here. The write-back log below is the same claim, evidenced.
 */
/** N-166. The header anchors predate this and stay as they are. */
const DATA_COLUMNS: Column[] = [
  { key: 'time', label: 'Time', width: '92px', comment: 'wb-th-time' },
  { key: 'type', label: 'Type', width: '130px', comment: 'wb-th-type' },
  { key: 'ref', label: 'Reference', width: '100px', comment: 'wb-th-ref' },
  { key: 'payload', label: 'Payload', comment: 'wb-th-payload' },
  { key: 'status', label: 'Status', width: '150px', comment: 'wb-th-status' }
]

function Ebms() {
  const { headers, cells } = useColumnOrder('ebms-log', DATA_COLUMNS)
  usePage('ebms')

  const state = useStore(ebmsStore, current => current)
  const viewer = useViewer()
  const { toast, show } = useToast(2400)

  const rows = state.writebacks.filter(row => matchesWbFilter(row, state.wbFilter))

  const retry = (id: number) => {
    retryWriteback(id)
    show('Retried — synced to EBMS')
  }

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/ebms'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <header className='topbar' data-comment='topbar'>
            <div className='crumb' data-comment='topbar-crumb'>
              <strong data-comment='topbar-crumb-root'>EBMS Integration</strong>
            </div>
            <div className='topbar-right' data-comment='topbar-right'>
              <span className='role-chip' data-comment='topbar-role'>
                {ROLE_LABELS[viewer?.role ?? 'admin']}
              </span>
              <div className='avatar' data-comment='topbar-avatar' title='John Enns'>
                JE
              </div>
            </div>
          </header>

          <div className='dept-bar' data-comment='dept-bar'>
            <div className='ebms-head' data-comment='ebms-head'>
              <div data-comment='ebms-head-text'>
                <h1 className='dept-title' data-comment='ebms-title'>
                  EBMS Integration
                </h1>
                <p className='ebms-subtitle' data-comment='ebms-subtitle'>
                  How data flows between EBMS and the production floor.
                </p>
              </div>
            </div>
          </div>

          <main className='content' data-comment='content'>
            <div className='stat-row' data-comment='stat-row'>
              <div className='stat-card' data-comment='stat-card-writebacks'>
                <div className='stat-label' data-comment='stat-label-writebacks'>
                  Write-backs today
                </div>
                <div
                  className='stat-value mono'
                  id='stat-writebacks'
                  data-comment='stat-value-writebacks'
                >
                  {state.writebacks.filter(row => row.status === 'Synced').length}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-card-pending'>
                <div className='stat-label' data-comment='stat-label-pending'>
                  Pending sync
                </div>
                <div
                  className='stat-value mono amber'
                  id='stat-pending'
                  data-comment='stat-value-pending'
                >
                  {state.writebacks.filter(row => row.status === 'Pending').length}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-card-failed'>
                <div className='stat-label' data-comment='stat-label-failed'>
                  Failed
                </div>
                <div
                  className='stat-value mono danger'
                  id='stat-failed'
                  data-comment='stat-value-failed'
                >
                  {state.writebacks.filter(row => row.status === 'Failed').length}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-card-lastimport'>
                <div className='stat-label' data-comment='stat-label-lastimport'>
                  Last import
                </div>
                <div className='stat-value mono' data-comment='stat-value-lastimport'>
                  08:04 AM
                </div>
              </div>
            </div>

            <h2 className='section-title' data-comment='flow-section-title'>
              Flow overview
            </h2>
            <div className='flow-row' data-comment='flow-row'>
              <div className='flow-card import' data-comment='flow-card-import'>
                <div className='flow-card-head' data-comment='flow-card-import-head'>
                  <ArrowRight className='flow-card-arrow' data-comment='flow-card-import-arrow' />
                  <span className='flow-card-title' data-comment='flow-card-import-title'>
                    EBMS → App · Import (read-only)
                  </span>
                </div>
                <FlowList items={IMPORT_ITEMS} prefix='import' />
              </div>

              <div className='flow-card writeback' data-comment='flow-card-writeback'>
                <div className='flow-card-head' data-comment='flow-card-writeback-head'>
                  <ArrowLeft className='flow-card-arrow' data-comment='flow-card-writeback-arrow' />
                  <span className='flow-card-title' data-comment='flow-card-writeback-title'>
                    App → EBMS · Write-back
                  </span>
                </div>
                <FlowList items={WRITEBACK_ITEMS} prefix='writeback' />
              </div>

              <div className='flow-card local' data-comment='flow-card-local'>
                <div className='flow-card-head' data-comment='flow-card-local-head'>
                  <Minus className='flow-card-arrow' data-comment='flow-card-local-arrow' />
                  <span className='flow-card-title' data-comment='flow-card-local-title'>
                    Local only · never synced
                  </span>
                </div>
                <FlowList items={LOCAL_ITEMS} prefix='local' />
              </div>
            </div>

            <h2 className='section-title' data-comment='wb-section-title'>
              Write-back log
            </h2>
            <div className='filter-row-chips' id='wb-filter-row' data-comment='wb-filter-row'>
              {WB_FILTERS.map(filter => (
                <button
                  className={`fchip${state.wbFilter === filter ? ' active' : ''}`}
                  data-comment={`wb-filter-${slug(filter)}`}
                  onClick={() => setWbFilter(filter)}
                  key={filter}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div id='wb-log-container' data-comment='wb-log-container'>
              {!rows.length ? (
                <div className='table-wrap' data-comment='wb-empty-wrap'>
                  <div className='empty' data-comment='wb-empty'>
                    <Inbox className='empty-ico' data-comment='wb-empty-icon' />
                    <h3 data-comment='wb-empty-title'>No write-backs match this filter</h3>
                    <p data-comment='wb-empty-text'>
                      Try a different filter, or check back after the next sync.
                    </p>
                  </div>
                </div>
              ) : (
                <div className='table-wrap' data-comment='wb-table-wrap'>
                  <table className='grid' data-comment='wb-table'>
                    <thead>
                      <tr>{headers}</tr>
                    </thead>
                    <tbody data-comment='wb-tbody'>
                      {rows.map(row => (
                        <tr data-comment={`wb-row-${row.id}`} key={row.id}>
                          {cells({
                            time: (
                              <td
                                data-col='time'
                                className='mono-cell'
                                data-comment={`wb-cell-time-${row.id}`}
                              >
                                {row.time}
                              </td>
                            ),
                            type: (
                              <td data-col='type' data-comment={`wb-cell-type-${row.id}`}>
                                <span className={`chip ${TYPE_META[row.type]}`}>
                                  <TypeIcon type={row.type} />
                                  {row.type}
                                </span>
                              </td>
                            ),
                            ref: (
                              <td
                                data-col='ref'
                                className='mono-cell'
                                data-comment={`wb-cell-ref-${row.id}`}
                              >
                                {row.ref}
                              </td>
                            ),
                            payload: (
                              <td
                                data-col='payload'
                                className='trunc muted'
                                data-comment={`wb-cell-payload-${row.id}`}
                              >
                                {row.payload}
                              </td>
                            ),
                            status: (
                              <td data-col='status' data-comment={`wb-cell-status-${row.id}`}>
                                <span className={`chip ${STATUS_META[row.status]}`}>
                                  <StatusIcon status={row.status} />
                                  {row.status}
                                </span>
                                {row.status === 'Failed' ? (
                                  <>
                                    {' '}
                                    <button
                                      className='btn btn-sm'
                                      data-comment={`wb-retry-${row.id}`}
                                      onClick={() => retry(row.id)}
                                    >
                                      Retry
                                    </button>
                                  </>
                                ) : null}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <h2 className='section-title' data-comment='import-section-title'>
              Import status
            </h2>
            <div className='panel' data-comment='import-panel'>
              <div className='panel-head' data-comment='import-panel-head'>
                <span className='panel-title' data-comment='import-panel-title'>
                  Last synced from EBMS
                </span>
              </div>
              <div className='import-metrics' data-comment='import-metrics'>
                <div className='import-metric' data-comment='import-metric-orders'>
                  <span className='import-metric-label' data-comment='import-metric-orders-label'>
                    Orders imported today
                  </span>
                  <span
                    className='import-metric-value mono'
                    data-comment='import-metric-orders-value'
                  >
                    9
                  </span>
                </div>
                <div className='import-metric' data-comment='import-metric-notes'>
                  <span className='import-metric-label' data-comment='import-metric-notes-label'>
                    Notes
                  </span>
                  <span
                    className='import-metric-value mono'
                    data-comment='import-metric-notes-value'
                  >
                    14
                  </span>
                </div>
                <div className='import-metric' data-comment='import-metric-coils'>
                  <span className='import-metric-label' data-comment='import-metric-coils-label'>
                    Coils synced
                  </span>
                  <span
                    className='import-metric-value mono'
                    data-comment='import-metric-coils-value'
                  >
                    9
                  </span>
                </div>
              </div>
              <div className='import-note' data-comment='import-conflict-note'>
                <CircleAlert data-comment='import-conflict-note-ico' />
                <span data-comment='import-conflict-note-text'>
                  Re-import conflict handling (local Width/Description/Qty edits vs. re-sent orders)
                  is an open question — see spec.
                </span>
              </div>
            </div>

            <p className='page-footnote' data-comment='page-footnote'>
              <Info data-comment='page-footnote-ico' />
              <span data-comment='page-footnote-text'>
                EBMS write-back is granular field-level PATCH — ship date (SHIP_DATE) and
                manufactured qty (C_MFG, per line via Details@delta) — not a monolithic “order
                complete” batch call. Coil-LF (N-108) &amp; Stock-Mfg (N-114) are spec additions not
                yet in the backend; confirm scope with John.
              </span>
            </p>
          </main>
        </div>
      </div>
      <Toast message={toast.message} type={toast.type} shown={toast.shown} />
    </>
  )
}
