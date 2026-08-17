import { MapPin, Printer } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import { orderLocLabel } from '../selectors'
import { trimStore } from '../store'
import { openLocPicker, showToast } from '../ui'
import { OrderInfoBlock } from './wrap-detail'

/**
 * N-097: what a completed order turned out to be — every line with the stock taken off it, and the
 * packages it left in. Read-only apart from a reprint, since the order is done.
 */
export const CompletedDetail = ({
  orderId,
  onClose
}: {
  orderId: number | null
  onClose: () => void
}) => {
  const orders = useStore(trimStore, state => state.orders)
  const order = orders.find(candidate => candidate.id === orderId)

  const batchQty =
    order?.lineItems.reduce(
      (sum, item) => sum + Math.max(0, item.qty - (item.fromStock || 0)),
      0
    ) ?? 0
  const packages = (order?.packages ?? []).filter(pkg => !pkg.deleted)

  return (
    <Overlay id='overlay-compdetail' comment='overlay-compdetail' open={!!order} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '660px' }}
        data-comment='compdetail-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='compdetail-head'
          titleComment='compdetail-title'
          descComment='compdetail-desc'
          title={
            order
              ? `Completed · ${order.order}${order.type === 'stock' ? '' : ` · ${order.customer}`}`
              : 'Completed order'
          }
          desc='Line items with stock taken, plus what went into each package.'
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='compdetail-body'
          data-comment='compdetail-body'
          style={{ paddingBottom: '18px' }}
        >
          {order ? (
            <>
              <div className='subhead' data-comment='compdetail-li-subhead'>
                <span className='subhead-title' data-comment='compdetail-li-title'>
                  Line items · manufacturing batch {batchQty} pcs (Qty − Stock)
                </span>
              </div>
              <div className='table-wrap' data-comment='compdetail-li-wrap'>
                <table className='grid' data-comment='compdetail-li-table' data-component='table'>
                  <thead>
                    <tr>
                      {/* #192: the wording Kevin uses on the floor — Qty Ordered / Stock Pulled */}
                      <th style={{ width: '130px' }}>Product ID</th>
                      <th>Description</th>
                      <th style={{ width: '90px' }}>Qty Ordered</th>
                      <th style={{ width: '100px' }}>Stock Pulled</th>
                      <th style={{ width: '110px' }}>Manufactured</th>
                    </tr>
                  </thead>
                  <tbody data-comment='compdetail-li-tbody'>
                    {order.lineItems.map((item, index) => (
                      <tr data-comment={`compdetail-li-${index}`} key={item.id}>
                        <td className='mono' data-comment={`compdetail-li-pid-${index}`}>
                          {item.productId}
                        </td>
                        <td className='trunc' data-comment={`compdetail-li-desc-${index}`}>
                          {item.description}
                        </td>
                        <td className='mono' data-comment={`compdetail-li-qty-${index}`}>
                          {item.qty}
                        </td>
                        <td className='mono' data-comment={`compdetail-li-stock-${index}`}>
                          {item.fromStock ? item.fromStock : <span className='subtle'>—</span>}
                        </td>
                        <td className='mono' data-comment={`compdetail-li-mfg-${index}`}>
                          {Math.max(0, item.qty - (item.fromStock || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className='subhead' data-comment='compdetail-pkg-subhead'>
                <span className='subhead-title' data-comment='compdetail-pkg-title'>
                  Packages
                </span>
              </div>
              {!packages.length ? (
                <p
                  className='subtle'
                  data-comment='compdetail-pkg-none'
                  style={{ fontSize: '12px', padding: '4px 2px' }}
                >
                  No packages recorded.
                </p>
              ) : (
                <div className='table-wrap' data-comment='compdetail-pkg-wrap'>
                  <table
                    className='grid'
                    data-comment='compdetail-pkg-table'
                    data-component='table'
                  >
                    <thead>
                      <tr>
                        <th style={{ width: '170px' }}>Package</th>
                        <th>Contents</th>
                        <th style={{ width: '110px' }} />
                      </tr>
                    </thead>
                    <tbody data-comment='compdetail-pkg-tbody'>
                      {packages.map((pkg, index) => (
                        <tr data-comment={`compdetail-pkg-${index}`} key={pkg.barcode}>
                          <td className='mono' data-comment={`compdetail-pkg-bc-${index}`}>
                            {pkg.barcode}
                          </td>
                          <td data-comment={`compdetail-pkg-ct-${index}`}>{pkg.contents}</td>
                          <td data-comment={`compdetail-pkg-act-${index}`}>
                            {/* #191: a label on the dock can be damaged after the order is done */}
                            <button
                              className='btn btn-sm'
                              data-comment={`compdetail-pkg-reprint-${index}`}
                              title='Reprint this package label'
                              onClick={() => showToast(`Reprinted label ${pkg.barcode}`)}
                            >
                              <Printer style={{ width: '14px', height: '14px' }} />
                              Reprint
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* #205/#210: the Wrapping window's order-info block, in the same place — under the
                  tables rather than above them. */}
              <OrderInfoBlock
                order={order}
                prefix='compdetail-info'
                location={
                  /* #210: a completed order can still be moved, so the location stays editable */
                  <span className='compdetail-loc' data-comment='compdetail-loc'>
                    {orderLocLabel(order)}
                    <button
                      className='btn btn-sm'
                      data-comment='compdetail-locbtn'
                      title='Change this order&rsquo;s location'
                      onClick={() => openLocPicker(order.id, 0)}
                    >
                      <MapPin style={{ width: '13px', height: '13px' }} />
                      Locations
                    </button>
                  </span>
                }
              />

              {/* #210/#211: when it was finished, centred under the order info */}
              <div className='compdetail-stamp' data-comment='compdetail-stamp'>
                {order.completedDate
                  ? `Completed ${fmtDate(order.completedDate)}${order.completedTime ? ` · ${order.completedTime}` : ''}`
                  : 'Completion time not recorded'}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Overlay>
  )
}
