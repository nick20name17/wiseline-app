import { fmtDate } from '../format'
import { completedOrders, orderLocLabel } from '../selectors'
import { trimStore } from '../store'
import { EmptyState } from './bits'

import { useStore } from '@/store/create-store'

/**
 * The order-level history, N-097. Completed cutlists and bendlists are not here — #192 moved those
 * into each machine tab of Production, where the worker who finished them looks.
 */
export const Completed = () => {
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
          <tr>
            <th style={{ width: '150px' }}>Ship Date</th>
            <th style={{ width: '150px' }}>Production Date</th>
            <th style={{ width: '180px' }}>Completed Date &amp; Time</th>
            <th style={{ width: '120px' }}>Order #</th>
            <th>Customer Name</th>
            <th style={{ width: '120px' }}>Trim Location</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => {
            return (
              <tr
                key={order.id}
                className='row-order'
                data-comment={`comp-row-${order.id}`}
                style={{ cursor: 'pointer' }}
              >
                <td className='cell-num muted' data-comment={`comp-ship-${order.id}`}>
                  {order.shipDate ? fmtDate(order.shipDate) : 'N/A'}
                </td>
                <td className='cell-num muted' data-comment={`comp-date-${order.id}`}>
                  {fmtDate(order.productionDate)}
                </td>
                <td className='cell-num' data-comment={`comp-completed-${order.id}`}>
                  {order.completedDate
                    ? `${fmtDate(order.completedDate)}${order.completedTime ? ` · ${order.completedTime}` : ''}`
                    : '—'}
                </td>
                <td className='cell-order' data-comment={`comp-ono-${order.id}`}>
                  {order.order}
                </td>
                <td className='cell-cust' data-comment={`comp-cust-${order.id}`}>
                  {order.type === 'stock' ? 'Stock' : order.customer}
                </td>
                <td className='mono muted' data-comment={`comp-loc-${order.id}`}>
                  {order.type === 'stock' ? 'N/A' : orderLocLabel(order)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
