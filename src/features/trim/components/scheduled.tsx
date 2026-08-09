import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Database,
  Package,
  SendHorizontal,
  Settings2,
  Split,
  TriangleAlert
} from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import {
  allMachinesAssigned,
  isOverdue,
  lineDay,
  nextWorkDays,
  orderLocLabel,
  orderMatchesSearch,
  releaseType,
  scheduledDays,
  scheduledOrders,
  sortScheduled,
  totalDailyCap
} from '../selectors'
import {
  releaseToProduction,
  setScheduledDay,
  TODAY,
  toggleExpand,
  toggleRelease,
  trimStore
} from '../store'
import { openSchedule, showToast } from '../ui'
import { EmptyState, NoteButton, OrderStatusPill, PriorityCell, ReviewedToggle } from './bits'
import { LineItemsSubrow } from './line-items'

import type { Order } from '../types'

/**
 * N-162. The day tabs are a rolling window — today plus the next four work days — and show even when
 * a day is empty, so the strip does not change shape as work is scheduled. Days carrying overdue
 * orders are pinned before today, and a day picked from the calendar joins them so a jump always has
 * a tab to land on.
 */
const dayTabs = (scheduledDay: string | null) => {
  const byDate = new Map(scheduledDays().map(day => [day.date, day]))
  const window = nextWorkDays(TODAY, 5)
  const overdue = [...byDate.keys()].filter(iso => isOverdue(iso))
  const picked = scheduledDay && scheduledDay !== 'all' ? [scheduledDay] : []

  const dates = [...new Set([...overdue, ...window, ...picked])].sort((a, b) => a.localeCompare(b))
  const days = dates.map(iso => byDate.get(iso) ?? { date: iso, bends: 0, orders: 0 })

  let active = scheduledDay
  if (active !== 'all' && (!active || !days.some(day => day.date === active)))
    active = window[0] ?? TODAY

  return { days, active }
}

const DayTabs = ({
  days,
  active,
  scheduledCount
}: {
  days: { date: string; bends: number; orders: number }[]
  active: string
  scheduledCount: number
}) => {
  const isAll = active === 'all'
  const dayCap = totalDailyCap()

  return (
    <div className='day-tabs' data-comment='sch-daytabs'>
      <button
        data-comment='sch-daytab-all'
        className={`day-tab day-tab-all ${isAll ? 'active' : ''}`}
        onClick={() => setScheduledDay('all')}
      >
        <span className='day-tab-date' data-comment='sch-daytab-all-label'>
          All Scheduled Orders
        </span>
        <span className='day-tab-cap mono' data-comment='sch-daytab-all-count'>
          {scheduledCount} orders
        </span>
      </button>

      <button
        className='day-picker'
        data-comment='sch-daypicker'
        title='Jump to a production day'
        onClick={() => openSchedule({ mode: 'jump', current: isAll ? null : active })}
      >
        <Calendar style={{ width: '15px', height: '15px' }} />
        <span className='day-picker-label' data-comment='sch-daypicker-label'>
          {isAll ? 'Pick a day' : fmtDate(active)}
        </span>
      </button>

      {days.map(day => {
        // over capacity is a soft warning and never blocks — the plant decides, not the tab
        const overCap = dayCap > 0 && day.bends > dayCap
        const pct = dayCap > 0 ? Math.min(100, Math.round((day.bends / dayCap) * 100)) : 0
        const warn = isOverdue(day.date) || overCap

        return (
          <div className='day-tab-wrap' key={day.date} data-comment={`sch-daytab-wrap-${day.date}`}>
            <button
              data-comment={`sch-daytab-${day.date}`}
              className={`day-tab ${day.date === active ? 'active' : ''}${warn ? ' overdue' : ''}`}
              onClick={() => setScheduledDay(day.date)}
            >
              <span className='day-tab-date' data-comment={`sch-daytab-date-${day.date}`}>
                {fmtDate(day.date)}
                {warn ? (
                  <>
                    {' '}
                    <TriangleAlert
                      style={{
                        width: '14px',
                        height: '14px',
                        color: 'var(--danger)',
                        verticalAlign: '-1px'
                      }}
                    />
                  </>
                ) : null}
              </span>
              <span
                className='day-tab-cap mono'
                data-comment={`sch-daytab-cap-${day.date}`}
                title={
                  overCap
                    ? 'Over capacity — soft warning'
                    : 'Assigned bends / total plant daily bend capacity'
                }
              >
                ({day.bends} / {dayCap}){overCap ? ' · over' : ''}
              </span>
              <span className='cap-bar' data-comment={`sch-daytab-bar-${day.date}`}>
                <span
                  style={{ width: `${pct}%`, background: warn ? 'var(--danger)' : 'var(--accent)' }}
                />
              </span>
            </button>
            <button
              className='day-tab-gear'
              data-comment={`sch-daytab-gear-${day.date}`}
              title='Machine Capacities report for this day'
            >
              <Settings2 style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Gate 3 (N-026): the release checkbox appears only once an order is Reviewed. Before that it is a
 * dash with the reason, and after release it is the icon saying the order has already gone.
 */
const SelectCell = ({ order, locked }: { order: Order; locked: boolean }) => {
  const releaseIds = useStore(trimStore, state => state.releaseIds)

  if (order.released)
    return (
      <span
        className='released-ico'
        data-comment={`sch-released-${order.id}`}
        title='Released to production'
      >
        <SendHorizontal style={{ width: '15px', height: '15px' }} />
      </span>
    )

  if (!order.reviewed)
    return (
      <span className='subtle' title='Mark Reviewed to select' style={{ fontSize: '11px' }}>
        —
      </span>
    )

  return (
    <input
      type='checkbox'
      className='chk'
      data-comment={`sch-relchk-${order.id}`}
      checked={releaseIds.includes(order.id)}
      disabled={locked}
      onChange={() => toggleRelease(order.id)}
    />
  )
}

const ColHeader = ({ col, label, width }: { col: string; label: string; width?: string }) => (
  <th
    data-col={col}
    draggable
    className='col-move'
    data-comment={`sch-colh-${col}`}
    title='Drag to reorder column'
    style={width ? { width } : undefined}
  >
    {label}
  </th>
)

export const Scheduled = () => {
  const { expandedIds, releaseIds, scheduledDay, orders } = useStore(trimStore, current => current)

  // nothing scheduled at all points back at Unscheduled; empty day tabs would say nothing
  if (!scheduledOrders(orders).length)
    return (
      <EmptyState
        title='Nothing scheduled'
        text='Schedule orders from the Unscheduled tab to see them here by production day.'
      />
    )

  const { days, active } = dayTabs(scheduledDay)
  const isAll = active === 'all'

  const dayOrders = scheduledOrders(orders)
    .filter(
      order =>
        (isAll || order.lineItems.some(item => lineDay(order, item) === active)) &&
        orderMatchesSearch(order)
    )
    .sort((a, b) =>
      isAll && a.productionDate !== b.productionDate
        ? (a.productionDate ?? '').localeCompare(b.productionDate ?? '')
        : sortScheduled(a, b)
    )

  const relType = releaseType()
  const selected = releaseIds.filter(id => dayOrders.some(order => order.id === id))
  // the 4-gate: releasing needs every selected order Reviewed, not just one of them
  const allSelectedReviewed =
    selected.length > 0 && selected.every(id => dayOrders.find(order => order.id === id)?.reviewed)

  const toolbar = (
    <div className='toolbar' data-comment='sch-toolbar'>
      <span className='toolbar-info' data-comment='sch-info'>
        {releaseIds.length ? (
          <>
            <b>{releaseIds.length}</b> {relType === 'stock' ? 'stock' : 'customer'} order
            {releaseIds.length === 1 ? '' : 's'} selected for release
          </>
        ) : (
          <>
            <b>{dayOrders.length}</b> {isAll ? 'scheduled ' : ''}order
            {dayOrders.length === 1 ? '' : 's'}
            {isAll ? '' : ` on ${fmtDate(active)}`}
          </>
        )}
      </span>

      <div className='toolbar-spacer' />

      {releaseIds.length ? (
        <span
          className='toolbar-info subtle'
          data-comment={relType === 'stock' ? 'sch-mutex-cust' : 'sch-mutex-stock'}
          style={{ fontSize: '11px' }}
        >
          {relType === 'stock' ? 'Customer' : 'Stock'} orders locked (type exclusion)
        </span>
      ) : null}

      <button className='btn' data-comment='sch-allocstock'>
        <Database style={{ width: '14px', height: '14px' }} />
        Allocated Stock
      </button>
      <button
        className='btn btn-primary'
        data-comment='sch-release'
        disabled={!allSelectedReviewed}
        onClick={() => {
          const done = releaseToProduction()
          if (done)
            showToast(
              `Released ${done.orders} order${done.orders > 1 ? 's' : ''} · ${done.cutlists} cutlist${done.cutlists > 1 ? 's' : ''} generated`
            )
        }}
        title={
          releaseIds.length && !allSelectedReviewed
            ? 'All selected orders must be Reviewed to release'
            : 'Release selected orders to production'
        }
      >
        <ArrowRight style={{ width: '14px', height: '14px' }} />
        Release to production{releaseIds.length ? ` (${releaseIds.length})` : ''}
      </button>
    </div>
  )

  return (
    <>
      <DayTabs days={days} active={active} scheduledCount={scheduledOrders(orders).length} />
      {toolbar}

      {dayOrders.length === 0 ? (
        <EmptyState
          title='No matching orders'
          text={
            isAll
              ? 'No scheduled orders match your search.'
              : `No orders scheduled for ${fmtDate(active)} match your search.`
          }
        />
      ) : (
        <div className='table-wrap' data-comment='sch-table-wrap'>
          <table className='grid' data-comment='sch-table'>
            <thead>
              <tr>
                <th style={{ width: '44px' }} />
                <th style={{ width: '30px' }} />
                <ColHeader col='ship' label='Ship' width='78px' />
                <ColHeader col='proddate' label='Prod. Date' width='128px' />
                <ColHeader col='order' label='Order #' width='104px' />
                <ColHeader col='customer' label='Customer' />
                <ColHeader col='priority' label='Priority' width='132px' />
                <ColHeader col='reviewed' label='Reviewed' width='132px' />
                <ColHeader col='status' label='Status' width='124px' />
                <ColHeader col='trimloc' label='Trim Location' width='104px' />
                <ColHeader col='notes' label='Notes' width='56px' />
              </tr>
            </thead>
            <tbody data-comment='sch-tbody'>
              {dayOrders.map(order => {
                const expanded = expandedIds.includes(order.id)
                const relSelected = releaseIds.includes(order.id)
                const mutexLocked = !!relType && order.type !== relType && !relSelected
                /**
                 * #211: releasing does not clear overdue. The rule is production date before today and
                 * not Done, and completed orders have already left this tab.
                 */
                const overdue = isOverdue(order.productionDate)

                return (
                  <Fragment key={order.id}>
                    <tr
                      className={`row-order ${relSelected ? 'selected' : ''}${overdue ? ' overdue' : ''}${expanded ? ' is-expanded' : ''}`}
                      data-comment={`sch-row-${order.id}`}
                      style={{ cursor: 'pointer' }}
                      onClick={event => {
                        if (
                          (event.target as HTMLElement).closest(
                            'button,input,select,textarea,a,label,[data-pop-anchor],.chk'
                          )
                        )
                          return
                        toggleExpand(order.id)
                      }}
                    >
                      <td data-comment={`sch-sel-${order.id}`}>
                        <SelectCell order={order} locked={mutexLocked} />
                      </td>
                      <td>
                        <button
                          aria-label='Toggle details'
                          className={`expander ${expanded ? 'open' : ''}`}
                          data-comment={`sch-exp-${order.id}`}
                          onClick={() => toggleExpand(order.id)}
                        >
                          <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </button>
                      </td>
                      <td
                        data-col='ship'
                        className='cell-num muted'
                        data-comment={`sch-ship-${order.id}`}
                      >
                        {order.shipDate ? fmtDate(order.shipDate) : '—'}
                      </td>
                      <td data-col='proddate' data-comment={`sch-proddate-${order.id}`}>
                        {order.type === 'stock' ? (
                          <Package
                            data-comment={`sch-stockico-${order.id}`}
                            style={{
                              width: '13px',
                              height: '13px',
                              verticalAlign: '-2px',
                              marginRight: '5px',
                              color: 'var(--text-subtle)'
                            }}
                          />
                        ) : null}
                        {order.released ? (
                          <span
                            className='cell-num muted'
                            data-comment={`sch-proddate-ro-${order.id}`}
                          >
                            {fmtDate(order.productionDate)}
                          </span>
                        ) : (
                          <button
                            className='field-btn'
                            data-pop-anchor
                            data-comment={`sch-proddate-btn-${order.id}`}
                            title='Change production day (pre-release, N-041)'
                            onClick={event => {
                              event.stopPropagation()
                              openSchedule({
                                mode: 'reschedule',
                                orderId: order.id,
                                order: order.order,
                                current: order.productionDate
                              })
                            }}
                          >
                            <Calendar style={{ width: '13px', height: '13px' }} />
                            {fmtDate(order.productionDate)}
                          </button>
                        )}
                      </td>
                      <td
                        data-col='order'
                        className='cell-order'
                        data-comment={`sch-order-${order.id}`}
                      >
                        {order.order}
                        {order.isSplit ? (
                          <span
                            className='split-ind'
                            data-comment={`sch-split-${order.id}`}
                            title={
                              order.lineItems.some(item => !lineDay(order, item))
                                ? 'Partially scheduled — some line items are still on the Unscheduled tab'
                                : 'Split across production days — see the lock icons for lines on another day'
                            }
                          >
                            <Split style={{ width: '14px', height: '14px' }} />
                          </span>
                        ) : null}
                      </td>
                      <td
                        data-col='customer'
                        className='cell-cust'
                        data-comment={`sch-cust-${order.id}`}
                      >
                        {order.type === 'stock' ? 'Stock' : order.customer}
                      </td>
                      <td data-col='priority' data-comment={`sch-pri-${order.id}`}>
                        <PriorityCell order={order} />
                      </td>
                      <td data-col='reviewed' data-comment={`sch-rev-${order.id}`}>
                        <ReviewedToggle order={order} gate1={allMachinesAssigned(order)} />
                      </td>
                      <td data-col='status' data-comment={`sch-status-${order.id}`}>
                        <OrderStatusPill order={order} />
                      </td>
                      <td
                        data-col='trimloc'
                        className='mono muted'
                        data-comment={`sch-loc-${order.id}`}
                      >
                        {order.type === 'stock' ? 'N/A' : orderLocLabel(order)}
                      </td>
                      <td data-col='notes' data-comment={`sch-note-${order.id}`}>
                        <NoteButton order={order} />
                      </td>
                    </tr>

                    {/* on «All Scheduled Orders» there is no single active day, so no line is elsewhere (#172) */}
                    {expanded ? (
                      <LineItemsSubrow order={order} ctx='sch' activeDay={isAll ? null : active} />
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
