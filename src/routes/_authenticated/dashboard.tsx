import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  CalendarClock,
  Database,
  Factory,
  Grid2x2,
  Layers,
  PackageCheck,
  TriangleAlert,
  Truck,
  Waypoints
} from 'lucide-react'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'

import { fmtDate } from '@/features/trim/format'
import {
  capClass,
  dashboardStore,
  deepLink,
  PRI_CLASS,
  setSearch,
  ST_CLASS
} from '@/features/dashboard/store'

import type { Dept } from '@/features/dashboard/store'

import '@/styles/dashboard.css'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard
})

const KpiIcon = ({ kpiKey }: { kpiKey: string }) => {
  if (kpiKey === 'overdue') return <TriangleAlert />
  if (kpiKey === 'inProduction') return <Factory />
  if (kpiKey === 'readyToShip') return <PackageCheck />
  if (kpiKey === 'lowCoils') return <Database />
  return <CalendarClock />
}

const DeptIcon = ({ deptKey }: { deptKey: string }) => {
  if (deptKey === 'rollforming') return <Waypoints />
  if (deptKey === 'accessories') return <Grid2x2 />
  if (deptKey === 'shipping') return <Truck />
  return <Layers />
}

const PipelinePart = ({
  deptKey,
  part,
  label,
  value
}: {
  deptKey: string
  part: string
  label: string
  value: number
}) => (
  <div className='dcard-part' data-comment={`dcard-${deptKey}-pipeline-${part}`}>
    <span className='dcard-part-label'>{label}</span>
    <span className='dcard-part-val'>{value}</span>
  </div>
)

const DeptCard = ({ dept }: { dept: Dept }) => {
  const pct = Math.round((dept.load / dept.cap) * 100)
  const cls = capClass(pct)

  return (
    <div className='dcard' data-comment={`dcard-${dept.key}`}>
      <div className='dcard-head' data-comment={`dcard-${dept.key}-head`}>
        <span className='dcard-ico' data-comment={`dcard-${dept.key}-icon`}>
          <DeptIcon deptKey={dept.key} />
        </span>
        <span className='dcard-name' data-comment={`dcard-${dept.key}-name`}>
          {dept.name}
        </span>
      </div>

      <div className='dcard-pipeline' data-comment={`dcard-${dept.key}-pipeline`}>
        <PipelinePart
          deptKey={dept.key}
          part='unscheduled'
          label='Unscheduled'
          value={dept.pipeline.unscheduled}
        />
        <PipelinePart
          deptKey={dept.key}
          part='scheduled'
          label='Scheduled'
          value={dept.pipeline.scheduled}
        />
        <PipelinePart
          deptKey={dept.key}
          part='inprod'
          label='In production'
          value={dept.pipeline.inProduction}
        />
        <PipelinePart
          deptKey={dept.key}
          part='done'
          label='Completed today'
          value={dept.pipeline.completedToday}
        />
      </div>

      <div data-comment={`dcard-${dept.key}-cap`}>
        <div className='dcard-cap-row' data-comment={`dcard-${dept.key}-cap-row`}>
          <span className='mono dcard-cap-text' data-comment={`dcard-${dept.key}-cap-text`}>
            {dept.load.toLocaleString()} / {dept.cap.toLocaleString()}{' '}
            <span className='unit'>pcs</span>
          </span>
          <span
            className={`mono dcard-cap-pct ${cls.replace('bar-', 'pct-')}`}
            data-comment={`dcard-${dept.key}-cap-pct`}
          >
            {pct}%
          </span>
        </div>
        <div className='mini-bar' data-comment={`dcard-${dept.key}-cap-bar`}>
          <span className={cls} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className='dcard-foot' data-comment={`dcard-${dept.key}-foot`}>
        <button
          className='dcard-open'
          data-comment={`dcard-${dept.key}-open`}
          onClick={() => {
            window.location.href = dept.href
          }}
        >
          Open
          <ArrowRight />
        </button>
      </div>
    </div>
  )
}

/**
 * The overview: five counts, the four departments' pipelines, today's load against capacity, and
 * everything due or overdue in one filterable list.
 *
 * Nothing here is derived from the department pages — the prototype gives this screen its own numbers,
 * and they do not add up to what the other pages show. That is the prototype's arrangement, kept.
 */
function Dashboard() {
  usePage('dashboard')

  const state = useStore(dashboardStore, current => current)
  const viewer = useViewer()

  const term = state.searchTerm.trim().toLowerCase()
  const rows = state.dueOrders.filter(
    order =>
      !term ||
      order.order.toLowerCase().includes(term) ||
      order.customer.toLowerCase().includes(term)
  )

  return (
    <div className='app' data-comment='app-shell'>
      <Sidebar
        current='/dashboard'
        role={viewer?.role ?? 'admin'}
        department={viewer?.department ?? 'all'}
        roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
      />

      <div className='main' data-comment='main'>
        <header className='topbar' data-comment='topbar'>
          <div className='crumb' data-comment='topbar-crumb'>
            <strong data-comment='topbar-crumb-root'>Overview</strong>
          </div>
          <div className='topbar-right' data-comment='topbar-right'>
            <div
              className='avatar'
              id='topbar-avatar'
              data-comment='topbar-avatar'
              title='John Enns'
            >
              JE
            </div>
          </div>
        </header>

        <div className='page-header' data-comment='page-header'>
          <div data-comment='page-header-text'>
            <h1 className='page-title' data-comment='page-title'>
              Overview
            </h1>
            <p className='page-subtitle' data-comment='page-subtitle'>
              Tue, July 14, 2026
            </p>
          </div>
        </div>

        <main className='content' data-comment='content'>
          <section id='view-dashboard' className='view active' data-comment='view-dashboard'>
            <div className='kpi-grid' id='kpi-grid' data-comment='kpi-grid'>
              {state.kpis.map(kpi => (
                <div className='kpi-card' data-comment={`kpi-card-${kpi.key}`} key={kpi.key}>
                  <div className='kpi-card-top' data-comment={`kpi-card-${kpi.key}-top`}>
                    <span className='kpi-label' data-comment={`kpi-card-${kpi.key}-label`}>
                      {kpi.label}
                    </span>
                    <span
                      className={`kpi-icon ${kpi.tone}`}
                      data-comment={`kpi-card-${kpi.key}-icon`}
                    >
                      <KpiIcon kpiKey={kpi.key} />
                    </span>
                  </div>
                  <div
                    className={`kpi-value mono ${kpi.tone === 'danger' || kpi.tone === 'amber' ? kpi.tone : ''}`}
                    data-comment={`kpi-card-${kpi.key}-value`}
                  >
                    {kpi.value}
                  </div>
                  <div className='kpi-sub' data-comment={`kpi-card-${kpi.key}-sub`}>
                    {kpi.sub}
                  </div>
                </div>
              ))}
            </div>

            <div className='section' data-comment='section-depts'>
              <div className='section-head' data-comment='section-depts-head'>
                <span className='section-title' data-comment='section-depts-title'>
                  Department status
                </span>
              </div>
              <div className='dept-grid' id='dept-grid' data-comment='dept-grid'>
                {state.depts.map(dept => (
                  <DeptCard dept={dept} key={dept.key} />
                ))}
              </div>
            </div>

            <div className='section' data-comment='section-load'>
              <div className='section-head' data-comment='section-load-head'>
                <span className='section-title' data-comment='section-load-title'>
                  Today's load
                </span>
              </div>
              <div className='load-wrap' id='load-wrap' data-comment='load-wrap'>
                {state.depts.map(dept => {
                  const pct = Math.round((dept.load / dept.cap) * 100)

                  return (
                    <div className='load-row' data-comment={`load-row-${dept.key}`} key={dept.key}>
                      <span className='load-name' data-comment={`load-row-${dept.key}-name`}>
                        {dept.name}
                      </span>
                      <div className='load-track' data-comment={`load-row-${dept.key}-track`}>
                        <span
                          className={`load-fill ${capClass(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className='load-value mono' data-comment={`load-row-${dept.key}-value`}>
                        {dept.load.toLocaleString()} / {dept.cap.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className='section' data-comment='section-due' style={{ marginBottom: 0 }}>
              <div className='section-head' data-comment='section-due-head'>
                <span className='section-title' data-comment='section-due-title'>
                  Upcoming &amp; overdue
                </span>
                <input
                  type='text'
                  className='due-filter'
                  id='due-filter'
                  data-comment='due-filter-input'
                  aria-label='Filter orders by number or customer'
                  placeholder='Filter by order # or customer…'
                  value={state.searchTerm}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>

              <div id='due-area' data-comment='due-area'>
                {!rows.length ? (
                  <div className='table-wrap' data-comment='due-empty-wrap'>
                    <div className='empty' data-comment='due-empty'>
                      <h3 data-comment='due-empty-title'>No matching orders</h3>
                      <p data-comment='due-empty-text'>Try a different order # or customer name.</p>
                      <button
                        className='btn btn-sm'
                        data-comment='due-empty-clear'
                        onClick={() => setSearch('')}
                      >
                        Clear filter
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='table-wrap' data-comment='due-table-wrap'>
                    <table className='grid' data-comment='due-table'>
                      <thead>
                        <tr>
                          <th style={{ width: '90px' }}>Order#</th>
                          <th>Customer</th>
                          <th style={{ width: '120px' }}>Dept</th>
                          <th style={{ width: '100px' }}>Ship date</th>
                          <th style={{ width: '120px' }}>Priority</th>
                          <th style={{ width: '130px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody data-comment='due-tbody'>
                        {rows.map(order => (
                          <tr
                            className={`due-row${order.overdue ? ' overdue' : ''}`}
                            data-comment={`due-row-${order.id}`}
                            onClick={() => {
                              window.location.href = deepLink(order)
                            }}
                            key={order.id}
                          >
                            <td className='mono-cell' data-comment={`due-cell-order-${order.id}`}>
                              {order.order}
                            </td>
                            <td
                              className='trunc cell-name'
                              data-comment={`due-cell-customer-${order.id}`}
                            >
                              {order.customer}
                            </td>
                            <td data-comment={`due-cell-dept-${order.id}`}>{order.dept}</td>
                            <td className='mono-cell' data-comment={`due-cell-ship-${order.id}`}>
                              {fmtDate(order.shipDate)}
                            </td>
                            <td data-comment={`due-cell-priority-${order.id}`}>
                              <span
                                className={`pri ${order.priority ? (PRI_CLASS[order.priority] ?? 'pri-none') : 'pri-none'}`}
                                data-comment={`pri-chip-${order.id}`}
                              >
                                <span className='pri-dot' />
                                {order.priority || 'No priority'}
                              </span>
                            </td>
                            <td data-comment={`due-cell-status-${order.id}`}>
                              <span
                                className={`status ${ST_CLASS[order.status] ?? 'st-notstarted'}`}
                                data-comment={`st-chip-${order.id}`}
                              >
                                <span className='st-dot' />
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
