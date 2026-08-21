import { ArrowLeft, MessageSquare, Warehouse } from 'lucide-react'

import { Fragment, useState } from 'react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { fmtDate } from '../format'
import { lineRemansOf } from '../reman'
import { isOverdue, lineDay, lineReleased, lineStatus, noteState, priorityById } from '../selectors'
import { trimStore } from '../store'
import { openNotes, showToast } from '../ui'
import { EmptyState, RemanBadge } from './bits'
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

/** N-166 */
const DATA_COLUMNS: Column[] = [
  { key: 'order', label: 'Order #', width: '116px' },
  { key: 'customer', label: 'Customer', width: '150px' },
  { key: 'qty', label: 'Qty', width: '58px' },
  { key: 'stock', label: 'Stock', width: '64px' },
  { key: 'priority', label: 'Priority', width: '124px' },
  { key: 'remfg', label: 'Remfg', width: '84px' },
  { key: 'status', label: 'Status', width: '112px' },
  { key: 'pid', label: 'ID', width: '104px' },
  { key: 'desc', label: 'Description' },
  { key: 'notes', label: 'Notes', width: '56px' }
]

/**
 * §242: the Wrapping tab is a flat list of every released line item, and clicking a row drills into
 * that order's package builder. The list is per *line*, so a split order's lines file under their own
 * production day (#172) rather than all under the order's earliest one.
 */
export const Wrapping = () => {
  const { headers, cells } = useColumnOrder('trim-wrap', DATA_COLUMNS, { notify: showToast })
  const { orders, remans } = useStore(trimStore, current => current)
  const [drillOrderId, setDrillOrderId] = useState<number | null>(null)

  // #6: an order reaches Wrapping part by part — a released day's lines are here while the other
  // half of a split order may still be under review
  const released = orders.filter(order => order.releasedDays.length && !order.completed)

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
    order.lineItems.forEach((item, index) => {
      if (!lineReleased(order, item)) return
      rows.push({ order, item, index, day: lineDay(order, item) || order.productionDate || '' })
    })

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
            {/* #213: no per-row date — the frozen day divider owns it, as on the cutlists */}
            {headers}
          </tr>
        </thead>
        <tbody data-comment='wrap-list-tbody'>
          {rows.map(({ order, item, index, day }) => {
            const key = `${order.id}-${index}`
            const priority = priorityById(order.priorityId)
            const status = item.status || lineStatus(order, item)
            const lineRemans = lineRemansOf(remans, order.id, item.id)
            const overdue = isOverdue(day) && status !== 'wrapped'

            const newDay = day !== lastDay
            const count = linesPerDay.get(day) ?? 0
            if (newDay) lastDay = day

            return (
              <Fragment key={key}>
                {newDay ? (
                  <tr className='day-row' data-comment={`wrap-daysep-${day}`}>
                    <td colSpan={10} data-comment={`wrap-daysep-cell-${day}`}>
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
                  {cells({
                    order: (
                      <td
                        data-col='order'
                        className='cell-order'
                        data-comment={`wrap-li-ono-${key}`}
                      >
                        {order.order}
                        {order.type === 'stock' ? (
                          <span
                            className='stock-ico'
                            data-comment={`wrap-li-stockico-${key}`}
                            title='Stock order'
                          >
                            <Warehouse style={{ width: '13px', height: '13px' }} />
                          </span>
                        ) : null}
                      </td>
                    ),
                    customer: (
                      <td
                        data-col='customer'
                        className='cell-cust'
                        data-comment={`wrap-li-cust-${key}`}
                      >
                        {order.type === 'stock' ? 'Stock' : order.customer}
                      </td>
                    ),
                    qty: (
                      <td data-col='qty' className='mono' data-comment={`wrap-li-qty-${key}`}>
                        {item.qty}
                      </td>
                    ),
                    stock: (
                      <td data-col='stock' className='mono' data-comment={`wrap-li-stock-${key}`}>
                        {item.fromStock ? item.fromStock : <span className='subtle'>—</span>}
                      </td>
                    ),
                    priority: (
                      <td data-col='priority' data-comment={`wrap-li-pri-${key}`}>
                        {priority ? (
                          <span className={`pri ${priority.cls} readonly`}>
                            <span className='pri-dot' />
                            {priority.name}
                          </span>
                        ) : (
                          <span className='subtle'>—</span>
                        )}
                      </td>
                    ),
                    /* verbatim: this cell holds orange until the *machine* marks the line Bent — the
                       Slinet's recut greens only the machine tab's copy */
                    remfg: (
                      <td data-col='remfg' data-comment={`wrap-li-rem-${key}`}>
                        {lineRemans.length ? (
                          <RemanBadge lineRemans={lineRemans} comment={`wrap-li-rembadge-${key}`} />
                        ) : (
                          <span className='subtle'>—</span>
                        )}
                      </td>
                    ),
                    status: (
                      <td data-col='status' data-comment={`wrap-li-st-${key}`}>
                        <StatusPill status={item.status} comment={`wrap-li-stp-${key}`} />
                      </td>
                    ),
                    pid: (
                      <td data-col='pid' className='mono' data-comment={`wrap-li-pid-${key}`}>
                        {item.productId}
                      </td>
                    ),
                    desc: (
                      <td data-col='desc' className='trunc' data-comment={`wrap-li-desc-${key}`}>
                        {item.description}
                      </td>
                    ),
                    notes: (
                      <td data-col='notes' data-comment={`wrap-li-note-${key}`}>
                        <button
                          className={`note-btn ${noteState(item.notes) === 'unread' ? 'has-unread' : noteState(item.notes) === 'read' ? 'all-read' : ''}`}
                          data-comment={`wrap-li-notebtn-${key}`}
                          title='Line notes'
                          // #130: the row drills into the order, so the button has to stop the click
                          // *and* do its own job — it used to only stop it
                          onClick={event => {
                            event.stopPropagation()
                            openNotes({ orderId: order.id, lineId: item.id })
                          }}
                        >
                          <MessageSquare style={{ width: '14px', height: '14px' }} />
                          {noteState(item.notes) !== 'none' ? <span className='note-dot' /> : null}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
