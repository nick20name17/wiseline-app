import { ArrowRight, Check, ChevronRight, Package } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import {
  gaugeColourLabel,
  groupSlug,
  GROUPS,
  isOverdue,
  orderInGroup,
  orderLocLabel,
  orderMatchesSearch,
  orderStatusLabel,
  scheduledDays,
  scheduledLineItemsOf,
  scheduledOrdersActive,
  scheduledSort
} from '../selectors'
import {
  CAP_PER_DAY,
  rollformingStore,
  setScheduledDay,
  toggleExpand,
  toggleExportSel,
  toggleReleaseSel
} from '../store'
import { EmptyState, GroupTabs, NoteButton, PriorityCell } from './bits'
import { LineItemsSubrow } from './line-items'

import type { Order } from '../types'

const COLUMNS = 17

/**
 * Reviewed is a gate, not a note: an order cannot be picked for Export or Release until it is on. Once
 * released it stops being a control — the review happened, and it says so.
 */
const ReviewedCell = ({ order }: { order: Order }) => {
  if (order.released)
    return (
      <span className='status st-notstarted' data-comment={`sch-revlock-${order.id}`}>
        Reviewed
      </span>
    )

  return (
    <span className='switch-wrap' data-comment={`sch-revwrap-${order.id}`}>
      <button
        className={`switch ${order.reviewed ? 'on' : ''}`}
        data-comment={`sch-revtoggle-${order.id}`}
      />
    </span>
  )
}

/** One day's orders, already filtered to a machine. `wrapKey` scopes the table so the two sections
 *  of the "All" overview cannot claim the same `data-comment` — row-level ones stay keyed by order id,
 *  because an order waiting on the Slit Line legitimately appears under its own profile too. */
const ScheduledTable = ({ orders, wrapKey }: { orders: Order[]; wrapKey: string }) => {
  const expandedIds = useStore(rollformingStore, state => state.expandedIds)
  const locations = useStore(rollformingStore, state => state.locations)

  return (
    <div className='table-wrap' data-comment={`sch-wrap${wrapKey}`} style={{ overflowX: 'auto' }}>
      <table className='grid' data-comment={`sch-table${wrapKey}`} style={{ minWidth: '1700px' }}>
        <thead>
          <tr>
            <th style={{ width: '34px' }} title='Export'>
              E
            </th>
            <th style={{ width: '34px' }} title='Release'>
              R
            </th>
            <th style={{ width: '28px' }} />
            <th style={{ width: '66px' }}>Ship</th>
            <th style={{ width: '104px' }}>Production</th>
            <th style={{ width: '106px' }}>Order #</th>
            <th style={{ width: '140px' }}>Customer</th>
            <th style={{ width: '112px' }}>Requested By</th>
            <th style={{ width: '150px' }}>Gauge / Colour</th>
            <th style={{ width: '96px' }}>PO</th>
            <th style={{ width: '104px' }}>Salesman</th>
            <th style={{ width: '120px' }}>Ship Via</th>
            <th style={{ width: '130px' }}>Priority</th>
            <th style={{ width: '118px' }}>Reviewed</th>
            <th style={{ width: '104px' }}>Status</th>
            <th style={{ width: '74px' }}>Loc.</th>
            <th style={{ width: '62px' }}>Notes</th>
          </tr>
        </thead>
        <tbody data-comment={`sch-tbody${wrapKey}`}>
          {orders.map(order => {
            const expanded = expandedIds.includes(order.id)
            // release does not clear overdue: the day it was due for is still the day it was due for
            const overdue = isOverdue(order.productionDate)

            return (
              <Fragment key={order.id}>
                <tr
                  className={`row-order ${overdue ? 'overdue' : ''}`}
                  data-comment={`sch-row-${order.id}`}
                  onClick={event => {
                    if (
                      (event.target as HTMLElement).closest(
                        'button,input,textarea,a,label,[data-pop-anchor],.chk,.switch'
                      )
                    )
                      return
                    toggleExpand(order.id)
                  }}
                >
                  <td data-comment={`sch-export-${order.id}`}>
                    {order.released ? (
                      order.exported ? (
                        <span className='status st-wrapped' data-comment={`sch-expico-${order.id}`}>
                          <Check style={{ width: '14px', height: '14px' }} />
                        </span>
                      ) : (
                        <span className='subtle'>—</span>
                      )
                    ) : (
                      <input
                        type='checkbox'
                        className='chk'
                        data-comment={`sch-expchk-${order.id}`}
                        checked={!!order.exportSel}
                        disabled={!order.reviewed}
                        onChange={() => toggleExportSel(order.id)}
                      />
                    )}
                  </td>
                  <td data-comment={`sch-rel-${order.id}`}>
                    {order.released ? (
                      <span
                        className='released-ico'
                        data-comment={`sch-relico-${order.id}`}
                        title='Released to production'
                      >
                        <Package style={{ width: '14px', height: '14px' }} />
                      </span>
                    ) : (
                      <input
                        type='checkbox'
                        className='chk'
                        data-comment={`sch-relchk-${order.id}`}
                        checked={!!order.releaseSel}
                        disabled={!order.reviewed}
                        onChange={() => toggleReleaseSel(order.id)}
                      />
                    )}
                  </td>
                  <td data-comment={`sch-expcell-${order.id}`}>
                    <button
                      aria-label='Toggle details'
                      className={`expander ${expanded ? 'open' : ''}`}
                      data-comment={`sch-exp-${order.id}`}
                      onClick={() => toggleExpand(order.id)}
                    >
                      <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </button>
                  </td>
                  <td className='cell-num muted' data-comment={`sch-ship-${order.id}`}>
                    {order.shipDate ? fmtDate(order.shipDate) : '—'}
                  </td>
                  <td className='cell-num muted' data-comment={`sch-proddate-${order.id}`}>
                    {order.productionDate ? fmtDate(order.productionDate) : '—'}
                  </td>
                  <td className='cell-order' data-comment={`sch-order-${order.id}`}>
                    {order.order}
                    {order.isSplit ? (
                      <span className='split-badge' data-comment={`sch-split-${order.id}`}>
                        Split
                      </span>
                    ) : null}
                  </td>
                  <td className='cell-cust' data-comment={`sch-cust-${order.id}`}>
                    {order.customer}
                  </td>
                  <td data-comment={`sch-reqby-${order.id}`}>
                    <span className='chip' data-comment={`sch-reqbychip-${order.id}`}>
                      {order.requestedBy}
                    </span>
                  </td>
                  <td className='mono trunc' data-comment={`sch-gc-${order.id}`}>
                    {gaugeColourLabel(order, scheduledLineItemsOf(order))}
                  </td>
                  <td className='mono muted' data-comment={`sch-po-${order.id}`}>
                    {order.po || '—'}
                  </td>
                  <td className='muted' data-comment={`sch-sales-${order.id}`}>
                    {order.salesman || '—'}
                  </td>
                  <td className='muted' data-comment={`sch-via-${order.id}`}>
                    {order.shipVia || '—'}
                  </td>
                  <td data-comment={`sch-pri-${order.id}`}>
                    <PriorityCell order={order} />
                  </td>
                  <td data-comment={`sch-rev-${order.id}`}>
                    <ReviewedCell order={order} />
                  </td>
                  <td data-comment={`sch-status-${order.id}`}>
                    <span className='subtle' style={{ fontSize: '11px' }}>
                      {orderStatusLabel(order)}
                    </span>
                  </td>
                  <td className='mono muted' data-comment={`sch-loc-${order.id}`}>
                    {orderLocLabel(order, locations)}
                  </td>
                  <td data-comment={`sch-note-${order.id}`}>
                    <NoteButton order={order} />
                  </td>
                </tr>
                {expanded ? <LineItemsSubrow order={order} ctx='sch' colSpan={COLUMNS} /> : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const ReleaseToolbar = ({ info }: { info: React.ReactNode }) => {
  const selected = useStore(
    rollformingStore,
    state => state.orders.filter(order => order.releaseSel).length
  )

  return (
    <div className='toolbar' data-comment='sch-toolbar'>
      <span className='toolbar-info' data-comment='sch-info'>
        {selected ? (
          <>
            <b>{selected}</b> order(s) selected
          </>
        ) : (
          info
        )}
      </span>
      <div className='toolbar-spacer' />
      <button className='btn btn-primary' data-comment='sch-releasebtn' disabled={!selected}>
        <ArrowRight style={{ width: '14px', height: '14px' }} />
        Export and/or Release To Production{selected ? ` (${selected})` : ''}
      </button>
    </div>
  )
}

/**
 * The day strip is built from every scheduled order, but the tables under it show only the ones still
 * to do — so a day whose work is all Complete keeps its tab and its capacity bar, and cannot warn
 * about work that no longer renders.
 */
export const Scheduled = () => {
  const state = useStore(rollformingStore, current => current)
  const days = scheduledDays(state.orders)

  if (!days.length)
    return (
      <>
        <GroupTabs prefix='sch' />
        <EmptyState
          title='Nothing scheduled'
          text='Schedule orders from the Unscheduled tab to see them here by production day.'
        />
      </>
    )

  const active =
    state.scheduledDay && days.some(day => day.date === state.scheduledDay)
      ? state.scheduledDay
      : (
          days.find(day =>
            scheduledOrdersActive(state.orders).some(order => order.productionDate === day.date)
          ) ?? days[0]!
        ).date

  const searching = state.searchTerm.trim() !== ''
  const ordersFor = (group: string) =>
    scheduledOrdersActive(state.orders)
      .filter(
        order =>
          order.productionDate === active &&
          orderMatchesSearch(order, state.searchTerm) &&
          orderInGroup(order, group)
      )
      .sort(scheduledSort)

  const dayTabs = (
    <div className='day-tabs' data-comment='sch-daytabs'>
      {days.map(day => {
        const pct = Math.min(100, Math.round((day.lf / CAP_PER_DAY) * 100))
        const overdue =
          isOverdue(day.date) &&
          scheduledOrdersActive(state.orders).some(order => order.productionDate === day.date)

        return (
          <button
            key={day.date}
            className={`day-tab ${day.date === active ? 'active' : ''}${overdue ? ' overdue' : ''}`}
            data-comment={`sch-daytab-${day.date}`}
            onClick={() => setScheduledDay(day.date)}
          >
            <span className='day-tab-date' data-comment={`sch-daytabdate-${day.date}`}>
              {fmtDate(day.date)}
              {overdue ? ' ⚠' : ''}
            </span>
            <span className='day-tab-cap mono' data-comment={`sch-daytabcap-${day.date}`}>
              {day.lf.toLocaleString()} / {CAP_PER_DAY.toLocaleString()} ln ft
            </span>
            <span className='cap-bar' data-comment={`sch-daytabbar-${day.date}`}>
              <span
                style={{
                  width: `${pct}%`,
                  background: overdue ? 'var(--danger)' : 'var(--accent)'
                }}
              />
            </span>
          </button>
        )
      })}
    </div>
  )

  if (state.activeGroup === 'All') {
    const sections = GROUPS.map(group => ({ group, orders: ordersFor(group) })).filter(
      section => section.orders.length
    )

    return (
      <>
        <GroupTabs prefix='sch' />
        {dayTabs}
        <ReleaseToolbar info={`Orders on ${fmtDate(active)}, all machines`} />

        {sections.length ? (
          sections.map(({ group, orders }) => (
            <Fragment key={group}>
              <div
                className='subhead-title'
                data-comment={`sch-allgroup-${groupSlug(group)}`}
                style={{ margin: '18px 2px 8px' }}
              >
                {group}
              </div>
              <ScheduledTable orders={orders} wrapKey={`-all-${groupSlug(group)}`} />
            </Fragment>
          ))
        ) : searching ? (
          <EmptyState
            title='No matching orders'
            text={`No orders scheduled for ${fmtDate(active)} match your search.`}
          />
        ) : (
          <EmptyState
            title='No active orders'
            text={`Orders scheduled for ${fmtDate(active)} are already in production — pick another day above.`}
          />
        )}
      </>
    )
  }

  const dayOrders = ordersFor(state.activeGroup)

  return (
    <>
      <GroupTabs prefix='sch' />
      {dayTabs}
      <ReleaseToolbar
        info={
          <>
            <b>{dayOrders.length}</b> order(s) on {fmtDate(active)} in {state.activeGroup}
          </>
        }
      />

      {dayOrders.length ? (
        <ScheduledTable orders={dayOrders} wrapKey='' />
      ) : searching ? (
        <EmptyState
          title='No matching orders'
          text={`No orders scheduled for ${fmtDate(active)} in ${state.activeGroup} match your search.`}
        />
      ) : (
        <EmptyState
          title='No active orders'
          text={`Orders scheduled for ${fmtDate(active)} in ${state.activeGroup} are already in production — pick another day above.`}
        />
      )}
    </>
  )
}
