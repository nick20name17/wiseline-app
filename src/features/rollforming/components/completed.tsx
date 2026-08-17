import { Clock } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { fmtDate, fmtDateTime } from '../format'
import { completedOrdersList, isFullyWrapped, orderLocLabel } from '../selectors'
import { rollformingStore } from '../store'
import { openCompletedDetail, showToast } from '../ui'
import { EmptyState } from './bits'

/**
 * The last 90 days of finished orders.
 *
 * An order arrives here once every line item is fully packaged, but its completion stamp stays
 * `waiting...` until the Wrapping Worker has given every package a Location — rolled is not the same
 * as done, and the column says which.
 */
/** N-166 */
const COLUMNS: Column[] = [
  { key: 'ship', label: 'Ship Date', width: '86px' },
  { key: 'prod', label: 'Production Date', width: '128px' },
  { key: 'completion', label: 'Completion Date & Time', width: '168px' },
  { key: 'order', label: 'Order #', width: '110px' },
  { key: 'customer', label: 'Customer' },
  { key: 'loc', label: 'Location', width: '110px' }
]

export const Completed = () => {
  const all = useStore(rollformingStore, state => state.orders)
  const locations = useStore(rollformingStore, state => state.locations)
  const orders = completedOrdersList(all)
  const { headers, cells } = useColumnOrder('rf-comp', COLUMNS, { notify: showToast })

  if (!orders.length)
    return (
      <EmptyState
        title='No completed orders'
        text='Orders finish rolling here once every line item is fully packaged.'
      />
    )

  return (
    <div className='table-wrap' data-comment='comp-wrap'>
      <table className='grid' data-comment='comp-table'>
        <thead>
          <tr>{headers}</tr>
        </thead>
        <tbody data-comment='comp-tbody'>
          {orders.map(order => (
            <tr
              key={order.id}
              className='row-order'
              data-comment={`comp-row-${order.id}`}
              onClick={() => openCompletedDetail(order.id)}
            >
              {cells({
                ship: (
                  <td
                    data-col='ship'
                    className='cell-num muted'
                    data-comment={`comp-ship-${order.id}`}
                  >
                    {order.shipDate ? fmtDate(order.shipDate) : '—'}
                  </td>
                ),
                prod: (
                  <td
                    data-col='prod'
                    className='cell-num muted'
                    data-comment={`comp-prod-${order.id}`}
                  >
                    {fmtDate(order.productionDate)}
                  </td>
                ),
                completion: (
                  <td data-col='completion' data-comment={`comp-completion-${order.id}`}>
                    {isFullyWrapped(order) ? (
                      <span className='mono' data-comment={`comp-completiontime-${order.id}`}>
                        {fmtDateTime(order.completedAt ?? null)}
                      </span>
                    ) : (
                      <span className='lock-tag' data-comment={`comp-waiting-${order.id}`}>
                        <Clock style={{ width: '14px', height: '14px' }} />
                        waiting...
                      </span>
                    )}
                  </td>
                ),
                order: (
                  <td
                    data-col='order'
                    className='cell-order'
                    data-comment={`comp-order-${order.id}`}
                  >
                    {order.order}
                  </td>
                ),
                customer: (
                  <td
                    data-col='customer'
                    className='cell-cust'
                    data-comment={`comp-cust-${order.id}`}
                  >
                    {order.customer}
                  </td>
                ),
                loc: (
                  <td data-col='loc' className='mono muted' data-comment={`comp-loc-${order.id}`}>
                    {orderLocLabel(order, locations)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
