import { ChevronDown, Printer } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { isOverdue, locName, rollCoils, supplierName, wrappingOrders } from '../selectors'
import { rollformingStore } from '../store'
import { openLocationPicker, showToast } from '../ui'
import { EmptyState, GroupTabs } from './bits'

/**
 * The Wrapping Worker's screen: every package Production created, waiting for a Location.
 *
 * An order leaves this list when all of its packages have one — the progress count in each head is
 * that story in two numbers.
 */
export const Wrapping = () => {
  const state = useStore(rollformingStore, current => current)
  const activeGroup = state.activeGroup

  const orders = wrappingOrders(activeGroup, state)

  if (!orders.length)
    return (
      <>
        <GroupTabs prefix='wrap' />
        <EmptyState
          title={`Nothing to wrap in ${activeGroup}`}
          text='Packages the Rollforming Worker creates in Production show here for Location assignment.'
        />
      </>
    )

  return (
    <>
      <GroupTabs prefix='wrap' />
      {orders.map((order, index) => {
        const packages = order.packages || []
        const total = packages.reduce((sum, pkg) => sum + pkg.qty, 0)
        const wrapped = packages
          .filter(pkg => pkg.locId != null)
          .reduce((sum, pkg) => sum + pkg.qty, 0)
        const overdue = isOverdue(order.productionDate)

        return (
          <div key={order.id} className='run' data-comment={`wrap-order-${index}`}>
            <div
              className='run-head'
              data-comment={`wrap-head-${index}`}
              style={overdue ? { background: 'var(--overdue-soft)' } : undefined}
            >
              <span className='cell-order' data-comment={`wrap-ono-${index}`}>
                {order.order}
              </span>
              <span className='subtle' data-comment={`wrap-cust-${index}`}>
                {order.customer}
              </span>
              {overdue ? (
                <span
                  className='split-badge'
                  style={{
                    color: 'var(--danger)',
                    background: 'var(--danger-soft)',
                    borderColor: 'var(--danger)'
                  }}
                  data-comment={`wrap-overdue-${index}`}
                >
                  Overdue
                </span>
              ) : null}
              <span className='toolbar-spacer' />
              <span
                className='mono subtle'
                data-comment={`wrap-progress-${index}`}
                style={{ fontSize: '11px' }}
              >
                {wrapped} / {total} wrapped
              </span>
            </div>

            <table
              className='sub'
              data-comment={`wrap-table-${index}`}
              style={{ border: 'none', borderRadius: 0 }}
            >
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Package #</th>
                  <th style={{ width: '56px' }}>Qty</th>
                  <th>Supplier / Coil Number</th>
                  <th style={{ width: '100px' }}>Location</th>
                  <th style={{ width: '200px' }} />
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg, row) => {
                  const item = order.lineItems.find(candidate => candidate.id === pkg.lineId)
                  // the package's material is the first unit still being rolled off a coil
                  const coil = item ? rollCoils(item)[0] : undefined

                  return (
                    <tr key={pkg.barcode} data-comment={`wrap-row-${index}-${row}`}>
                      <td className='mono' data-comment={`wrap-bc-${index}-${row}`}>
                        {pkg.barcode}
                      </td>
                      <td className='mono' data-comment={`wrap-qty-${index}-${row}`}>
                        {pkg.qty}
                      </td>
                      <td className='mono trunc' data-comment={`wrap-sc-${index}-${row}`}>
                        {coil
                          ? `${supplierName(coil.supplierId, state.suppliers)} · ${coil.coilNumber || 'Undefined'}`
                          : '—'}
                      </td>
                      <td className='mono muted' data-comment={`wrap-loc-${index}-${row}`}>
                        {pkg.locId ? locName(pkg.locId, state.locations) : '—'}
                      </td>
                      <td data-comment={`wrap-act-${index}-${row}`}>
                        <div className='act-cell'>
                          {pkg.locId ? (
                            <span className='subtle' style={{ fontSize: '11px' }}>
                              Located ✓
                            </span>
                          ) : (
                            <button
                              className='field-btn'
                              data-pop-anchor
                              data-comment={`wrap-selectloc-${index}-${row}`}
                              onClick={() => openLocationPicker({ orderId: order.id, seq: pkg.seq })}
                            >
                              Select Location
                              <ChevronDown />
                            </button>
                          )}
                          <button
                            className='icon-btn'
                            title='Reprint label'
                            data-comment={`wrap-reprint-${index}-${row}`}
                            onClick={() => showToast(`Reprinted label ${pkg.barcode}`)}
                          >
                            <Printer style={{ width: '14px', height: '14px' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </>
  )
}
