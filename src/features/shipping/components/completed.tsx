import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import { completedOrders, loadById, loadLabel } from '../selectors'
import { shippingStore, toggleCompletedExpand } from '../store'
import { showToast } from '../ui'
import { EmptyState, LineItemsTable, ShipViaCell } from './bits'

/** N-166 */
const DATA_COLUMNS: Column[] = [
  { key: 'order', label: 'Order #', width: '112px' },
  { key: 'customer', label: 'Customer' },
  { key: 'city', label: 'City', width: '104px' },
  { key: 'via', label: 'Ship Via', width: '120px' },
  { key: 'weight', label: 'Weight', width: '92px' },
  { key: 'truck', label: 'Truck', width: '84px' },
  { key: 'load', label: 'Load', width: '96px' },
  { key: 'date', label: 'Delivered', width: '104px' }
]

/** Ninety days of delivered orders, by delivery date. A row ages out ninety days after it landed. */
export const CompletedModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const state = useStore(shippingStore, current => current)
  const { headers, cells } = useColumnOrder('shp-comp', DATA_COLUMNS, { notify: showToast })
  const orders = completedOrders(state.orders)

  return (
    <Overlay id='overlay-completed' comment='overlay-completed' open={open} onClose={onClose}>
      <div className='modal wide' data-comment='completed-modal' data-component='dialog'>
        <ModalHead
          comment='completed-head'
          titleComment='completed-title'
          descComment='completed-desc'
          title='Completed orders · past 90 days'
          desc='Delivered orders from the past 90 days, by delivery date. Rows age out 90 days after delivery.'
          onClose={onClose}
        />
        <div className='modal-body' id='completed-body' data-comment='completed-body'>
          {!orders.length ? (
            <EmptyState
              title='No completed orders'
              text='Orders delivered in the last 90 days land here. They age out 90 days after delivery.'
              commentKey='comp'
            />
          ) : (
            <div className='table-wrap' data-comment='comp-table-wrap'>
              <div className='table-scroll'>
                <table className='grid' data-comment='comp-table' data-component='table'>
                  <thead>
                    <tr>
                      <th style={{ width: '22px' }} />
                      {headers}
                    </tr>
                  </thead>
                  <tbody data-comment='comp-tbody'>
                    {orders.map(order => {
                      const load = order.loadId ? loadById(order.loadId, state.loads) : null
                      const expanded = state.expCompleted.includes(order.id)

                      return (
                        <Fragment key={order.id}>
                          <tr
                            className='row-order'
                            data-comment={`comp-row-${order.id}`}
                            onClick={event => {
                              if (
                                (event.target as HTMLElement).closest(
                                  'button,input,select,textarea,a,label,[data-pop-anchor],.chk'
                                )
                              )
                                return
                              toggleCompletedExpand(order.id)
                            }}
                          >
                            <td>
                              <button
                                aria-label='Toggle details'
                                className={`expander ${expanded ? 'open' : ''}`}
                                data-comment={`comp-exp-${order.id}`}
                                onClick={() => toggleCompletedExpand(order.id)}
                              >
                                <ChevronRight style={{ width: '14px', height: '14px' }} />
                              </button>
                            </td>
                            {cells({
                              order: (
                                <td
                                  data-col='order'
                                  className='cell-order'
                                  data-comment={`comp-order-${order.id}`}
                                >
                                  {order.order}
                                  {order.pickup ? (
                                    <span
                                      className='pickup-badge'
                                      data-comment={`comp-pickup-${order.id}`}
                                    >
                                      Pickup
                                    </span>
                                  ) : null}
                                </td>
                              ),
                              customer: (
                                <td
                                  data-col='customer'
                                  className='cell-cust trunc'
                                  data-comment={`comp-cust-${order.id}`}
                                >
                                  {order.customer}
                                </td>
                              ),
                              city: (
                                <td
                                  data-col='city'
                                  className='trunc'
                                  data-comment={`comp-city-${order.id}`}
                                >
                                  {order.city}
                                </td>
                              ),
                              via: (
                                <td data-col='via' data-comment={`comp-shipvia-${order.id}`}>
                                  <ShipViaCell order={order} />
                                </td>
                              ),
                              weight: (
                                <td
                                  data-col='weight'
                                  className='cell-num'
                                  data-comment={`comp-weight-${order.id}`}
                                >
                                  {order.weight.toLocaleString('en-US')} lb
                                </td>
                              ),
                              truck: (
                                <td
                                  data-col='truck'
                                  className='cell-num'
                                  data-comment={`comp-truck-${order.id}`}
                                >
                                  {order.truckId || '—'}
                                </td>
                              ),
                              load: (
                                <td
                                  data-col='load'
                                  className='cell-num'
                                  data-comment={`comp-load-${order.id}`}
                                >
                                  {load ? loadLabel(load, state.loads) : '—'}
                                </td>
                              ),
                              date: (
                                <td
                                  data-col='date'
                                  className='cell-num muted'
                                  data-comment={`comp-date-${order.id}`}
                                >
                                  {fmtDate(order.shipDate)}
                                </td>
                              )
                            })}
                          </tr>
                          {expanded ? (
                            <tr className='subrow' data-comment={`comp-subrow-${order.id}`}>
                              <td colSpan={9}>
                                <div className='subwrap' data-comment={`comp-subwrap-${order.id}`}>
                                  <LineItemsTable order={order} ctx='comp' />
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className='modal-foot' data-comment='completed-foot'>
          <button className='btn btn-ghost' data-comment='completed-close' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Overlay>
  )
}
