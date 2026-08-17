import { fmtDate } from '../format'
import { completedOrders, orderLocLabel } from '../selectors'
import { trimStore } from '../store'
import { openCompDetail, showToast } from '../ui'
import { EmptyState } from './bits'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

/** N-166 */
const DATA_COLUMNS: Column[] = [
  { key: 'ship', label: 'Ship Date', width: '104px' },
  { key: 'prod', label: 'Production Date', width: '128px' },
  { key: 'completed', label: 'Completed Date & Time', width: '186px' },
  { key: 'order', label: 'Order #', width: '110px' },
  { key: 'customer', label: 'Customer Name' },
  { key: 'loc', label: 'Trim Location', width: '110px' }
]

/**
 * The order-level history, N-097. Completed cutlists and bendlists are not here — #192 moved those
 * into each machine tab of Production, where the worker who finished them looks.
 */
export const Completed = () => {
  const { headers, cells } = useColumnOrder('trim-comp', DATA_COLUMNS, { notify: showToast })
  useStore(trimStore, state => state.orders)
  const orders = completedOrders()

  if (!orders.length)
    return (
      <EmptyState
        title='No completed orders'
        text='Orders you finish wrapping and mark complete land here.'
      />
    )

  return (
    <div className='table-wrap' data-comment='comp-wrap'>
      <table className='grid' data-comment='comp-table'>
        <thead>
          <tr>{headers}</tr>
        </thead>
        <tbody>
          {orders.map(order => {
            return (
              <tr
                key={order.id}
                className='row-order'
                data-comment={`comp-row-${order.id}`}
                style={{ cursor: 'pointer' }}
                onClick={() => openCompDetail(order.id)}
              >
                {cells({
                  ship: (
                    <td
                      data-col='ship'
                      className='cell-num muted'
                      data-comment={`comp-ship-${order.id}`}
                    >
                      {order.shipDate ? fmtDate(order.shipDate) : 'N/A'}
                    </td>
                  ),
                  prod: (
                    <td
                      data-col='prod'
                      className='cell-num muted'
                      data-comment={`comp-date-${order.id}`}
                    >
                      {fmtDate(order.productionDate)}
                    </td>
                  ),
                  completed: (
                    <td
                      data-col='completed'
                      className='cell-num'
                      data-comment={`comp-completed-${order.id}`}
                    >
                      {order.completedDate
                        ? `${fmtDate(order.completedDate)}${order.completedTime ? ` · ${order.completedTime}` : ''}`
                        : '—'}
                    </td>
                  ),
                  order: (
                    <td
                      data-col='order'
                      className='cell-order'
                      data-comment={`comp-ono-${order.id}`}
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
                      {order.type === 'stock' ? 'Stock' : order.customer}
                    </td>
                  ),
                  loc: (
                    <td data-col='loc' className='mono muted' data-comment={`comp-loc-${order.id}`}>
                      {order.type === 'stock' ? 'N/A' : orderLocLabel(order)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
