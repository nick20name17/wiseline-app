import { Calendar, ChevronRight, Lock } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { fmtDate } from '../format'
import {
  isOverdue,
  matchesSearch,
  scheduledDays,
  scheduledLineItemsOf,
  scheduledOrders,
  scheduledSort,
  truckDisplay
} from '../selectors'
import { accessoriesStore, setScheduledDay, toggleExpand } from '../store'
import { openReschedule, showToast } from '../ui'
import {
  EmptyState,
  ItemStatusPill,
  LineNoteButton,
  OrderNoteButton,
  OrderStatusPill,
  PriorityCell,
  SchedDetailBar,
  ShipViaCell
} from './bits'

import type { Order } from '../types'

const OVERDUE_BADGE_STYLE = {
  color: 'var(--danger)',
  background: 'var(--danger-soft)',
  borderColor: 'var(--danger)'
}

/**
 * An order opened in Scheduled.
 *
 * Once a package exists the Reschedule button is replaced by a lock chip rather than disabled: the date
 * is no longer the Manager's to move, and saying why is the point of the chip.
 */
const Subrow = ({ order }: { order: Order }) => {
  const items = scheduledLineItemsOf(order)
  const hasPackages = order.packages.some(pkg => !pkg.deleted)

  return (
    <tr className='subrow' data-comment={`sch-subrow-${order.id}`}>
      <td colSpan={8}>
        <div className='subwrap' data-comment={`sch-subwrap-${order.id}`}>
          <div className='subhead' data-comment={`sch-subhead-${order.id}`}>
            <span className='subhead-title' data-comment={`sch-subtitle-${order.id}`}>
              {order.isSplit
                ? `Viewing partial — line items scheduled for ${fmtDate(order.prepDate)}`
                : 'Scheduled line items'}
            </span>
            {hasPackages ? (
              <span className='chip' data-comment={`sch-locked-${order.id}`}>
                <Lock style={{ width: '12px', height: '12px' }} />
                Packaging started — reschedule locked
              </span>
            ) : (
              <button
                className='btn btn-sm'
                data-pop-anchor
                data-comment={`sch-reschedule-${order.id}`}
                onClick={() => openReschedule(order.id)}
              >
                <Calendar style={{ width: '14px', height: '14px' }} />
                Reschedule / Unschedule
              </button>
            )}
          </div>

          <SchedDetailBar order={order} ctx='sch' />

          <table className='sub' data-comment={`sch-litable-${order.id}`}>
            <thead>
              <tr>
                <th style={{ width: '88px' }}>Qty Ordered</th>
                <th style={{ width: '118px' }}>Status</th>
                <th style={{ width: '76px' }}>ID</th>
                <th>Description</th>
                <th style={{ width: '48px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr data-comment={`sch-li-${item.id}`} key={item.id}>
                  <td className='cell-num' data-comment={`sch-liq-${item.id}`}>
                    {item.qtyOrdered}
                  </td>
                  <td data-comment={`sch-list-${item.id}`}>
                    <ItemStatusPill item={item} />
                  </td>
                  <td className='mono' data-comment={`sch-lipid-${item.id}`}>
                    {item.productId}
                  </td>
                  <td className='trunc' data-comment={`sch-lidesc-${item.id}`}>
                    {item.description}
                  </td>
                  <td data-comment={`sch-linotes-${item.id}`}>
                    <LineNoteButton
                      item={item}
                      orderId={order.id}
                      commentKey={`sch-linote-${item.id}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}

/** N-166 */
const DATA_COLUMNS: Column[] = [
  { key: 'order', label: 'Order #', width: '170px' },
  { key: 'priority', label: 'Priority', width: '150px' },
  { key: 'customer', label: 'Customer' },
  { key: 'truck', label: 'Truck', width: '110px' },
  { key: 'via', label: 'Ship Via', width: '110px' },
  { key: 'status', label: 'Status', width: '132px' },
  { key: 'notes', label: 'Notes', width: '64px' }
]

/** The Manager's scheduling view: scheduled orders grouped by the day they are prepped for. */
export const Scheduled = () => {
  const { headers, cells } = useColumnOrder('acc-sch', DATA_COLUMNS, { notify: showToast })
  const state = useStore(accessoriesStore, current => current)
  const days = scheduledDays(state.orders)

  if (!days.length)
    return (
      <EmptyState
        title='Nothing scheduled'
        text='Set a Prep Date on Unscheduled orders to see them here, organised by day.'
        commentKey='sch'
      />
    )

  const active =
    !state.scheduledDay || !days.some(day => day.date === state.scheduledDay)
      ? (days[0]?.date as string)
      : state.scheduledDay

  const dayOrders = scheduledOrders(state.orders)
    .filter(order => order.prepDate === active && matchesSearch(order, state.search))
    .sort(scheduledSort(state.priorities))

  return (
    <>
      <div className='day-tabs' data-comment='sch-daytabs'>
        {days.map(day => (
          <button
            className={`day-tab ${day.date === active ? 'active' : ''}${day.overdue ? ' overdue' : ''}`}
            data-comment={`sch-daytab-${day.date}`}
            onClick={() => setScheduledDay(day.date)}
            key={day.date}
          >
            <span className='day-tab-date' data-comment={`sch-daytabdate-${day.date}`}>
              {fmtDate(day.date)}
              {day.overdue ? ' ⚠' : ''}
            </span>
            <span className='day-tab-meta' data-comment={`sch-daytabmeta-${day.date}`}>
              {day.count} order{day.count !== 1 ? 's' : ''}
              {day.overdue ? ` · ${day.overdue} overdue` : ''}
            </span>
          </button>
        ))}
      </div>

      <div className='toolbar' data-comment='sch-toolbar'>
        <span className='toolbar-info' data-comment='sch-info'>
          <b>{dayOrders.length}</b> order{dayOrders.length !== 1 ? 's' : ''} scheduled for{' '}
          {fmtDate(active)}
        </span>
      </div>

      {!dayOrders.length ? (
        <EmptyState
          title='No matching orders'
          text={`No orders scheduled for ${fmtDate(active)} match your search.`}
          commentKey='sch-day'
        />
      ) : (
        <div className='table-wrap' data-comment='sch-wrap'>
          <table className='grid' data-comment='sch-table'>
            <thead>
              <tr>
                <th style={{ width: '30px' }} />
                {headers}
              </tr>
            </thead>
            <tbody data-comment='sch-tbody'>
              {dayOrders.map(order => {
                const overdue = isOverdue(order)
                const expanded = state.expandedIds.includes(order.id)

                return (
                  <Fragment key={order.id}>
                    <tr
                      className={`row-order${overdue ? ' overdue' : ''}`}
                      data-comment={`sch-row-${order.id}`}
                      onClick={event => {
                        if (
                          (event.target as HTMLElement).closest(
                            'button,input,textarea,a,label,[data-pop-anchor],.chk'
                          )
                        )
                          return
                        toggleExpand(order.id)
                      }}
                    >
                      <td data-comment={`sch-expcell-${order.id}`}>
                        <button
                          aria-label='Toggle details'
                          className={`expander${expanded ? ' open' : ''}`}
                          data-comment={`sch-exp-${order.id}`}
                          onClick={() => toggleExpand(order.id)}
                        >
                          <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </button>
                      </td>
                      {cells({
                        order: (
                          <td
                            data-col='order'
                            className='cell-order'
                            data-comment={`sch-ono-${order.id}`}
                          >
                            {order.orderNumber}
                            {order.isSplit ? (
                              <>
                                {' '}
                                <span
                                  className='split-badge'
                                  data-comment={`sch-splitbadge-${order.id}`}
                                >
                                  Partial
                                </span>
                              </>
                            ) : null}
                            {overdue ? (
                              <>
                                {' '}
                                <span
                                  className='split-badge'
                                  style={OVERDUE_BADGE_STYLE}
                                  data-comment={`sch-overduebadge-${order.id}`}
                                >
                                  Overdue
                                </span>
                              </>
                            ) : null}
                          </td>
                        ),
                        priority: (
                          <td data-col='priority' data-comment={`sch-pricell-${order.id}`}>
                            <PriorityCell order={order} />
                          </td>
                        ),
                        customer: (
                          <td
                            data-col='customer'
                            className='cell-cust trunc'
                            data-comment={`sch-cust-${order.id}`}
                          >
                            {order.customer}
                          </td>
                        ),
                        truck: (
                          <td
                            data-col='truck'
                            className='mono muted'
                            data-comment={`sch-truck-${order.id}`}
                          >
                            {truckDisplay(order)}
                          </td>
                        ),
                        via: (
                          <td data-col='via' data-comment={`sch-shipvia-${order.id}`}>
                            <ShipViaCell order={order} />
                          </td>
                        ),
                        status: (
                          <td data-col='status' data-comment={`sch-status-${order.id}`}>
                            <OrderStatusPill order={order} />
                          </td>
                        ),
                        notes: (
                          <td data-col='notes' data-comment={`sch-notes-${order.id}`}>
                            <OrderNoteButton order={order} />
                          </td>
                        )
                      })}
                    </tr>

                    {expanded ? <Subrow order={order} /> : null}
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
