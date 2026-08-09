import { Clock } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { fmtDate, fmtDateTime } from '../format'
import { completedOrdersList, isFullyWrapped, orderLocLabel } from '../selectors'
import { rollformingStore } from '../store'
import { EmptyState } from './bits'

/**
 * The last 90 days of finished orders.
 *
 * An order arrives here once every line item is fully packaged, but its completion stamp stays
 * `waiting...` until the Wrapping Worker has given every package a Location — rolled is not the same
 * as done, and the column says which.
 */
export const Completed = () => {
  const all = useStore(rollformingStore, state => state.orders)
  const locations = useStore(rollformingStore, state => state.locations)
  const orders = completedOrdersList(all)

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
          <tr>
            <th style={{ width: '86px' }}>Ship Date</th>
            <th style={{ width: '128px' }}>Production Date</th>
            <th style={{ width: '168px' }}>Completion Date &amp; Time</th>
            <th style={{ width: '110px' }}>Order #</th>
            <th>Customer</th>
            <th style={{ width: '110px' }}>Location</th>
          </tr>
        </thead>
        <tbody data-comment='comp-tbody'>
          {orders.map(order => (
            <tr key={order.id} className='row-order' data-comment={`comp-row-${order.id}`}>
              <td className='cell-num muted' data-comment={`comp-ship-${order.id}`}>
                {order.shipDate ? fmtDate(order.shipDate) : '—'}
              </td>
              <td className='cell-num muted' data-comment={`comp-prod-${order.id}`}>
                {fmtDate(order.productionDate)}
              </td>
              <td data-comment={`comp-completion-${order.id}`}>
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
              <td className='cell-order' data-comment={`comp-order-${order.id}`}>
                {order.order}
              </td>
              <td className='cell-cust' data-comment={`comp-cust-${order.id}`}>
                {order.customer}
              </td>
              <td className='mono muted' data-comment={`comp-loc-${order.id}`}>
                {orderLocLabel(order, locations)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
