import { ArrowLeft, MessageSquare, RefreshCw, Warehouse } from 'lucide-react'

import { Fragment, useState } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import { isOverdue, lineDay, lineStatus, noteState, priorityById } from '../selectors'
import { trimStore } from '../store'
import { EmptyState } from './bits'
import { WrapOrderDetail } from './wrap-detail'

import type { LineItem, Order } from '../types'

const PRODUCTION_STATUS: Record<string, [string, string]> = {
  stock: ['st-stock', 'Stock'],
  not_started: ['st-notstarted', 'Not Started'],
  in_progress: ['st-inprogress', 'In Progress'],
  cut: ['st-cut', 'Cut'],
  bent: ['st-bent', 'Bent'],
  wrapped: ['st-wrapped', 'Wrapped'],
  bypassed: ['st-bypassed', 'Bypassed']
}

const StatusPill = ({ status, comment }: { status: string | null; comment: string }) => {
  const [cls, label] = PRODUCTION_STATUS[status ?? ''] ?? PRODUCTION_STATUS.not_started!

  return (
    <span className={`status ${cls}`} data-comment={comment}>
      <span className='st-dot' />
      {label}
    </span>
  )
}

type Row = { order: Order; item: LineItem; index: number; day: string }

/**
 * §242: the Wrapping tab is a flat list of every released line item, and clicking a row drills into
 * that order's package builder. The list is per *line*, so a split order's lines file under their own
 * production day (#172) rather than all under the order's earliest one.
 */
export const Wrapping = () => {
  const { orders, remans } = useStore(trimStore, current => current)
  const [drillOrderId, setDrillOrderId] = useState<number | null>(null)

  const released = orders.filter(order => order.released && !order.completed)

  // an order that is completed or unreleased while its detail is open drops back to the list
  const drilled = released.find(order => order.id === drillOrderId)
  if (drilled)
    return (
      <>
        <div className='toolbar' data-comment='wrap-detail-toolbar'>
          <button
            className='btn btn-sm'
            data-comment='wrap-back'
            onClick={() => setDrillOrderId(null)}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
            Back to Wrapping
          </button>
          <div className='toolbar-spacer' />
        </div>
        <WrapOrderDetail order={drilled} />
      </>
    )

  if (!released.length)
    return (
      <EmptyState
        title='Nothing to wrap'
        text='Released orders show here as individual line items. Click a line to enter a wrapping quantity, select a location, then Create & print.'
      />
    )

  const rows: Row[] = []
  for (const order of released)
    order.lineItems.forEach((item, index) =>
      rows.push({ order, item, index, day: lineDay(order, item) || order.productionDate || '' })
    )

  /**
   * #202: production date, then priority, then product id. Ascending date already floats the overdue
   * rows — their day is in the past — so N-095 needs no term of its own.
   */
  rows.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      (priorityById(a.order.priorityId)?.hierarchy || 99) -
        (priorityById(b.order.priorityId)?.hierarchy || 99) ||
      a.item.productId.localeCompare(b.item.productId) ||
      a.order.id - b.order.id ||
      a.index - b.index
  )

  const linesPerDay = new Map<string, number>()
  for (const row of rows) linesPerDay.set(row.day, (linesPerDay.get(row.day) ?? 0) + 1)

  let lastDay: string | null = null

  return (
    <div className='table-wrap' data-comment='wrap-list-wrap'>
      <table className='grid' data-comment='wrap-list-table'>
        <thead>
          <tr>
            <th style={{ width: '104px' }}>Prod. Date</th>
            <th style={{ width: '96px' }}>Order #</th>
            <th>Customer</th>
            <th style={{ width: '60px' }}>Qty</th>
            <th style={{ width: '60px' }}>Stock</th>
            <th style={{ width: '120px' }}>Priority</th>
            <th style={{ width: '64px' }}>Remfg</th>
            <th style={{ width: '118px' }}>Status</th>
            <th style={{ width: '116px' }}>ID</th>
            <th>Description</th>
            <th style={{ width: '56px' }}>Notes</th>
          </tr>
        </thead>
        <tbody data-comment='wrap-list-tbody'>
          {rows.map(({ order, item, index, day }) => {
            const key = `${order.id}-${index}`
            const priority = priorityById(order.priorityId)
            const status = item.status || lineStatus(order, item)
            const lineRemans = remans.filter(
              reman => reman.orderId === order.id && reman.lineId === item.id
            )
            const overdue = isOverdue(day) && status !== 'wrapped'

            const newDay = day !== lastDay
            const count = linesPerDay.get(day) ?? 0
            if (newDay) lastDay = day

            return (
              <Fragment key={key}>
                {newDay ? (
                  <tr className='day-row' data-comment={`wrap-daysep-${day}`}>
                    <td colSpan={11} data-comment={`wrap-daysep-cell-${day}`}>
                      {fmtDate(day)}{' '}
                      <span className='day-count' data-comment={`wrap-daysep-count-${day}`}>
                        {count} line item{count > 1 ? 's' : ''}
                      </span>
                    </td>
                  </tr>
                ) : null}

                <tr
                  className={`row-order${overdue ? ' overdue' : ''}`}
                  data-comment={`wrap-li-${key}`}
                  style={{ cursor: 'pointer' }}
                  title='Open wrapping detail'
                  onClick={() => setDrillOrderId(order.id)}
                >
                  <td className='cell-num muted' data-comment={`wrap-li-date-${key}`}>
                    {order.type === 'stock' ? (
                      <span
                        className='stock-ico'
                        data-comment={`wrap-li-stockico-${key}`}
                        title='Stock order'
                      >
                        <Warehouse style={{ width: '13px', height: '13px' }} />
                      </span>
                    ) : null}
                    {fmtDate(day)}
                  </td>
                  <td className='cell-order' data-comment={`wrap-li-ono-${key}`}>
                    {order.order}
                  </td>
                  <td className='cell-cust' data-comment={`wrap-li-cust-${key}`}>
                    {order.type === 'stock' ? 'Stock' : order.customer}
                  </td>
                  <td className='mono' data-comment={`wrap-li-qty-${key}`}>
                    {item.qty}
                  </td>
                  <td className='mono' data-comment={`wrap-li-stock-${key}`}>
                    {item.fromStock ? item.fromStock : <span className='subtle'>—</span>}
                  </td>
                  <td data-comment={`wrap-li-pri-${key}`}>
                    {priority ? (
                      <span className={`pri ${priority.cls} readonly`}>
                        <span className='pri-dot' />
                        {priority.name}
                      </span>
                    ) : (
                      <span className='subtle'>—</span>
                    )}
                  </td>
                  {/* verbatim: this cell holds orange until the *machine* marks the line Bent — the
                      Slinet's recut greens only the machine tab's copy */}
                  <td data-comment={`wrap-li-rem-${key}`}>
                    {lineRemans.length ? (
                      <span
                        className={`rework-badge ${lineRemans.every(reman => reman.bent) ? 'rework-done' : 'rework-pending'}`}
                        data-comment={`wrap-li-rembadge-${key}`}
                        title={`Remanufacture${lineRemans.every(reman => reman.bent) ? ' complete' : ' outstanding'}`}
                      >
                        <RefreshCw style={{ width: '14px', height: '14px' }} />
                        {lineRemans.reduce((sum, reman) => sum + reman.qty, 0)}
                      </span>
                    ) : (
                      <span className='subtle'>—</span>
                    )}
                  </td>
                  <td data-comment={`wrap-li-st-${key}`}>
                    <StatusPill status={item.status} comment={`wrap-li-stp-${key}`} />
                  </td>
                  <td className='mono' data-comment={`wrap-li-pid-${key}`}>
                    {item.productId}
                  </td>
                  <td className='trunc' data-comment={`wrap-li-desc-${key}`}>
                    {item.description}
                  </td>
                  <td data-comment={`wrap-li-note-${key}`}>
                    <button
                      className={`note-btn ${noteState(item.notes) === 'unread' ? 'has-unread' : noteState(item.notes) === 'read' ? 'all-read' : ''}`}
                      data-comment={`wrap-li-notebtn-${key}`}
                      title='Line notes'
                      onClick={event => event.stopPropagation()}
                    >
                      <MessageSquare style={{ width: '14px', height: '14px' }} />
                      {noteState(item.notes) !== 'none' ? <span className='note-dot' /> : null}
                    </button>
                  </td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
