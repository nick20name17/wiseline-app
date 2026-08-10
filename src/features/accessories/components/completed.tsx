import { ChevronRight, MapPin, Package } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import { completedOrdersList } from '../selectors'
import { accessoriesStore, toggleExpand } from '../store'
import { openLocationPicker, openPackages } from '../ui'
import { DetailField, EmptyState } from './bits'
import { LocTags } from './locations'

import type { Order } from '../types'

/**
 * A completed order still shows its location, and can still be given another one — an order that has
 * shipped may not have left the warehouse, and the labels can be reprinted from here for 90 days.
 */
const Subrow = ({ order }: { order: Order }) => (
  <tr className='subrow' data-comment={`comp-subrow-${order.id}`}>
    <td colSpan={6}>
      <div className='subwrap' data-comment={`comp-subwrap-${order.id}`}>
        <div className='detail-bar' data-comment={`comp-detailbar-${order.id}`}>
          <div className='detail-col' data-comment={`comp-col1-${order.id}`}>
            <DetailField
              label='Customer'
              value={order.customer}
              commentKey={`comp-cust2-${order.id}`}
            />
            <DetailField
              label='Order #'
              value={order.orderNumber}
              commentKey={`comp-ono2-${order.id}`}
            />
            <DetailField label='PO #' value={order.po || '—'} commentKey={`comp-po-${order.id}`} />
            <DetailField
              label='Salesman'
              value={order.salesman || '—'}
              commentKey={`comp-sales-${order.id}`}
            />
          </div>
          <div className='detail-col' data-comment={`comp-col2-${order.id}`}>
            <DetailField
              label='Ship Via'
              value={order.shipVia}
              commentKey={`comp-shipvia-${order.id}`}
            />
            <div className='detail-field' data-comment={`comp-floc-${order.id}`}>
              <span className='detail-label'>Accessories Location</span>
              <div className='loc-tags' data-comment={`comp-loctags-${order.id}`}>
                <LocTags order={order} />
              </div>
            </div>
          </div>
        </div>

        <table className='sub' data-comment={`comp-litable-${order.id}`}>
          <thead>
            <tr>
              <th style={{ width: '88px' }}>Qty Ordered</th>
              <th style={{ width: '80px' }}>Packaged</th>
              <th style={{ width: '76px' }}>ID</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr data-comment={`comp-li-${item.id}`} key={item.id}>
                <td className='cell-num' data-comment={`comp-liq-${item.id}`}>
                  {item.qtyOrdered}
                </td>
                <td className='cell-num' data-comment={`comp-lip-${item.id}`}>
                  {item.qtyOrdered - item.leftToPackage}
                </td>
                <td className='mono' data-comment={`comp-lipid-${item.id}`}>
                  {item.productId}
                </td>
                <td className='trunc' data-comment={`comp-lidesc-${item.id}`}>
                  {item.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className='pkgbuilder' data-comment={`comp-pkgbuilder-${order.id}`}>
          <button
            className='btn'
            data-comment={`comp-selectloc-${order.id}`}
            onClick={event => {
              event.stopPropagation()
              openLocationPicker(order.id)
            }}
          >
            <MapPin style={{ width: '14px', height: '14px' }} />
            Manage location
          </button>
          {order.packages.length ? (
            <button
              className='btn'
              data-comment={`comp-seepkg-${order.id}`}
              onClick={event => {
                event.stopPropagation()
                openPackages(order.id)
              }}
            >
              <Package style={{ width: '14px', height: '14px' }} />
              See packages
            </button>
          ) : null}
        </div>
      </div>
    </td>
  </tr>
)

/** Packaged and completed orders, kept for 90 days and then aged out. */
export const Completed = () => {
  const expandedIds = useStore(accessoriesStore, state => state.expandedIds)
  useStore(accessoriesStore, state => state.orders)

  const rows = completedOrdersList()

  if (!rows.length)
    return (
      <EmptyState
        title='No completed orders'
        text='Packaged and completed orders land here for 90 days.'
      />
    )

  return (
    <div className='table-wrap' data-comment='comp-wrap'>
      <table className='grid' data-comment='comp-table'>
        <thead>
          <tr>
            <th style={{ width: '30px' }} />
            <th style={{ width: '112px' }}>Completed</th>
            <th style={{ width: '110px' }}>Order #</th>
            <th>Customer</th>
            <th style={{ width: '70px' }}>Items</th>
            <th style={{ width: '90px' }}>Packages</th>
          </tr>
        </thead>
        <tbody data-comment='comp-tbody'>
          {rows.map(order => {
            const expanded = expandedIds.includes(order.id)

            return (
              <Fragment key={order.id}>
                <tr
                  className='row-order'
                  data-comment={`comp-row-${order.id}`}
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
                  <td>
                    <button
                      aria-label='Toggle details'
                      className={`expander${expanded ? ' open' : ''}`}
                      data-comment={`comp-exp-${order.id}`}
                      onClick={() => toggleExpand(order.id)}
                    >
                      <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </button>
                  </td>
                  <td className='cell-num muted' data-comment={`comp-date-${order.id}`}>
                    {fmtDate(order.completedDate)}
                  </td>
                  <td className='cell-order' data-comment={`comp-ono-${order.id}`}>
                    {order.orderNumber}
                  </td>
                  <td className='cell-cust trunc' data-comment={`comp-cust-${order.id}`}>
                    {order.customer}
                  </td>
                  <td className='cell-num' data-comment={`comp-items-${order.id}`}>
                    {order.items.length}
                  </td>
                  <td className='cell-num' data-comment={`comp-pkgs-${order.id}`}>
                    {order.packages.filter(pkg => !pkg.deleted).length}
                  </td>
                </tr>

                {expanded ? <Subrow order={order} /> : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
