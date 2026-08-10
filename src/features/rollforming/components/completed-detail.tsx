import { ChevronDown, Info, List, Package, Printer } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate, fmtDateTime } from '../format'
import { locName } from '../selectors'
import { rollformingStore } from '../store'
import { openLocationPicker, showToast } from '../ui'

const SUBHEAD = { margin: '0 2px 6px', display: 'flex', alignItems: 'center', gap: '6px' }

/**
 * A finished order, opened from the Completed list.
 *
 * The Location is still a control here rather than a label: a bundle gets moved in the warehouse after
 * it was rolled, and the record has to be able to follow it. Everything else is read-only.
 */
export const CompletedDetail = ({
  orderId,
  onClose
}: {
  orderId: number | null
  onClose: () => void
}) => {
  const orders = useStore(rollformingStore, state => state.orders)
  const locations = useStore(rollformingStore, state => state.locations)
  const order = orders.find(candidate => candidate.id === orderId)
  const packages = order?.packages ?? []

  return (
    <Overlay
      id='overlay-completed-detail'
      comment='overlay-completed-detail'
      open={!!order}
      onClose={onClose}
    >
      <div
        className='modal'
        style={{ maxWidth: '600px' }}
        data-comment='compdet-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='compdet-head'
          titleComment='compdet-title'
          descComment='compdet-desc'
          title={
            order
              ? `${order.order}${order.customer !== '—' ? ` · ${order.customer}` : ''}`
              : 'Order detail'
          }
          desc='View/edit Location and reprint labels.'
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='compdet-body'
          data-comment='compdet-body'
          style={{ paddingBottom: '18px' }}
        >
          {order ? (
            <>
              <div className='note-box' data-comment='compdet-note'>
                <Info style={{ width: '14px', height: '14px' }} />
                Ship {order.shipDate ? fmtDate(order.shipDate) : '—'} · Production{' '}
                {fmtDate(order.productionDate)} · Completed {fmtDateTime(order.completedAt ?? null)}
              </div>

              <div className='subhead-title' data-comment='compdet-lihead' style={SUBHEAD}>
                <List style={{ width: '13px', height: '13px' }} />
                Line items · {order.lineItems.length}
              </div>
              <table
                className='sub'
                data-comment='compdet-litable'
                data-component='table'
                style={{ marginBottom: '16px' }}
              >
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Product ID</th>
                    <th style={{ width: '120px' }}>Profile</th>
                    <th>Gauge / Color</th>
                    <th className='num' style={{ width: '54px' }}>
                      Qty
                    </th>
                    <th className='num' style={{ width: '70px' }}>
                      From Stock
                    </th>
                    <th className='num' style={{ width: '54px' }}>
                      W&quot;
                    </th>
                    <th className='num' style={{ width: '54px' }}>
                      L&quot;
                    </th>
                    <th className='num' style={{ width: '80px' }}>
                      Packaged
                    </th>
                  </tr>
                </thead>
                <tbody data-comment='compdet-litbody'>
                  {order.lineItems.map((item, index) => {
                    const packaged = packages
                      .filter(pkg => pkg.lineId === item.id)
                      .reduce((total, pkg) => total + pkg.qty, 0)

                    return (
                      <tr data-comment={`compdet-li-${index}`} key={item.id}>
                        <td className='mono' data-comment={`compdet-lipid-${index}`}>
                          {item.productId}
                        </td>
                        <td className='trunc' data-comment={`compdet-liprof-${index}`}>
                          {item.profile}
                        </td>
                        <td className='trunc' data-comment={`compdet-ligc-${index}`}>
                          {item.gauge}ga · {item.color}
                        </td>
                        <td className='num mono' data-comment={`compdet-liqty-${index}`}>
                          {item.qty}
                        </td>
                        <td className='num mono' data-comment={`compdet-listock-${index}`}>
                          {item.fromStock || 0}
                        </td>
                        <td className='num mono' data-comment={`compdet-liwt-${index}`}>
                          {item.width ? `${item.width}"` : '—'}
                        </td>
                        <td className='num mono' data-comment={`compdet-lilen-${index}`}>
                          {item.length ? `${item.length}"` : '—'}
                        </td>
                        <td className='num mono' data-comment={`compdet-lipkg-${index}`}>
                          {packaged}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className='subhead-title' data-comment='compdet-pkghead' style={SUBHEAD}>
                <Package style={{ width: '13px', height: '13px' }} />
                Packages · {packages.length}
              </div>
              <table className='sub' data-comment='compdet-table' data-component='table'>
                <thead>
                  <tr>
                    <th style={{ width: '140px' }}>Package #</th>
                    <th style={{ width: '56px' }}>Qty</th>
                    <th>Description</th>
                    <th style={{ width: '100px' }}>Location</th>
                    <th style={{ width: '150px' }} />
                  </tr>
                </thead>
                <tbody data-comment='compdet-tbody'>
                  {packages.map((pkg, index) => {
                    const item = order.lineItems.find(candidate => candidate.id === pkg.lineId)

                    return (
                      <tr data-comment={`compdet-row-${index}`} key={pkg.barcode}>
                        <td className='mono' data-comment={`compdet-bc-${index}`}>
                          {pkg.barcode}
                        </td>
                        <td className='mono' data-comment={`compdet-qty-${index}`}>
                          {pkg.qty}
                        </td>
                        <td className='trunc' data-comment={`compdet-desc-${index}`}>
                          {item ? `${item.profile} · ${item.gauge}ga ${item.color}` : '—'}
                        </td>
                        <td data-comment={`compdet-loc-${index}`}>
                          <button
                            className='field-btn'
                            data-pop-anchor
                            data-comment={`compdet-locbtn-${index}`}
                            onClick={() => openLocationPicker({ orderId: order.id, seq: pkg.seq })}
                          >
                            {pkg.locId ? locName(pkg.locId, locations) : 'Edit'}
                            <ChevronDown />
                          </button>
                        </td>
                        <td data-comment={`compdet-act-${index}`}>
                          <button
                            className='btn btn-sm'
                            data-comment={`compdet-reprint-${index}`}
                            onClick={() => showToast(`Reprinted label ${pkg.barcode}`)}
                          >
                            <Printer style={{ width: '14px', height: '14px' }} />
                            Reprint
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      </div>
    </Overlay>
  )
}
