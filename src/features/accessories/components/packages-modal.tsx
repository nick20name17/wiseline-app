import { Fragment } from 'react'
import { Printer, Trash2 } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { locById } from '../selectors'
import { accessoriesStore } from '../store'
import { reprintLabel, requestDeletePackage } from '../ui'

import type { Order, Package } from '../types'

/** The label as it prints, verbatim from the spec — a CSS card standing in for a real printer. */
const LabelCard = ({ order, pkg }: { order: Order; pkg: Package }) => (
  <div
    className={`label-card${pkg.deleted ? ' deleted' : ''}`}
    data-comment={`label-card-${pkg.seq}`}
  >
    <div className='label-row'>
      <span className='label-k'>Customer:</span>
      <span>{order.customer}</span>
    </div>
    <div className='label-row'>
      <span className='label-k'>Sales Order #:</span>
      <span>{order.orderNumber}</span>
    </div>
    <div className='label-row'>
      <span className='label-k'>PO #:</span>
      <span>{order.po && order.po !== '—' ? order.po : ''}</span>
    </div>
    {pkg.items.map(line => {
      const item = order.items.find(entry => entry.id === line.itemId)

      return (
        // a Fragment, not a div: the prototype writes the two lines straight into the card
        <Fragment key={line.itemId}>
          <div className='label-desc' data-comment={`lbl-desc-${pkg.seq}`}>
            {item ? item.description : line.productId}
          </div>
          <div className='label-qty' data-comment={`lbl-qty-${pkg.seq}`}>
            {line.qty} - {line.productId}
          </div>
        </Fragment>
      )
    })}
    <div className='label-weight'>Weight: {pkg.weight.toFixed(1)} lbs.</div>
    <div className='label-barcode' />
    <div className='label-code'>{pkg.code.replace(/-/g, ' - ')}</div>
    {pkg.deleted ? (
      <div className='label-row' style={{ marginTop: '6px', color: 'var(--danger)' }}>
        Deleted — barcode invalid
      </div>
    ) : null}
  </div>
)

/**
 * What has been printed for this order.
 *
 * A deleted package keeps its row and its label card, greyed: the label exists in the world whatever
 * the app thinks, and someone scanning it needs to be told it was voided rather than that it is unknown.
 */
export const PackagesModal = ({
  orderId,
  onClose
}: {
  orderId: number | null
  onClose: () => void
}) => {
  const orders = useStore(accessoriesStore, state => state.orders)
  const locations = useStore(accessoriesStore, state => state.locations)
  const order = orders.find(entry => entry.id === orderId)
  const packages = order?.packages ?? []

  return (
    <Overlay id='overlay-packages' comment='overlay-packages' open={!!order} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '700px' }}
        data-comment='pkg-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='pkg-head'
          titleComment='pkg-title'
          descComment='pkg-desc'
          title={`Packages · ${order?.orderNumber ?? ''}`}
          desc='Deleting returns pieces to Left To Package and invalidates the barcode.'
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='pkg-body'
          data-comment='pkg-body'
          style={{ paddingBottom: '18px' }}
        >
          {!order ? null : !packages.length ? (
            <div className='empty' data-comment='pkg-empty' style={{ padding: '36px 12px' }}>
              <p data-comment='pkg-empty-text'>No packages created yet.</p>
            </div>
          ) : (
            <>
              <table className='sub' data-comment='pkg-modal-table' data-component='table'>
                <thead>
                  <tr>
                    <th style={{ width: '140px' }}>Package</th>
                    <th>Contents</th>
                    <th style={{ width: '80px' }}>Weight</th>
                    <th style={{ width: '90px' }}>Location</th>
                    <th style={{ width: '210px' }} />
                  </tr>
                </thead>
                <tbody data-comment='pkg-modal-tbody'>
                  {packages.map((pkg, index) =>
                    pkg.deleted ? (
                      <tr data-comment={`pkgm-row-${index}`} key={pkg.id}>
                        <td className='mono muted' data-comment={`pkgm-bc-${index}`}>
                          {pkg.code}
                        </td>
                        <td className='muted' colSpan={3} data-comment={`pkgm-ct-${index}`}>
                          Deleted — barcode invalid
                        </td>
                        <td data-comment={`pkgm-act-${index}`} />
                      </tr>
                    ) : (
                      <tr data-comment={`pkgm-row-${index}`} key={pkg.id}>
                        <td className='mono' data-comment={`pkgm-bc-${index}`}>
                          {pkg.code}
                        </td>
                        <td className='trunc' data-comment={`pkgm-ct-${index}`}>
                          {pkg.items.map(line => `${line.qty}× ${line.productId}`).join(', ')}
                        </td>
                        <td className='mono muted' data-comment={`pkgm-w-${index}`}>
                          {pkg.weight.toFixed(2)} lb
                        </td>
                        <td className='mono muted' data-comment={`pkgm-loc-${index}`}>
                          {pkg.locationId ? (locById(pkg.locationId, locations)?.code ?? '—') : '—'}
                        </td>
                        <td data-comment={`pkgm-act-${index}`}>
                          <button
                            className='btn btn-sm'
                            data-comment={`pkgm-reprint-${index}`}
                            onClick={() => reprintLabel(pkg.code)}
                          >
                            <Printer style={{ width: '14px', height: '14px' }} />
                            Reprint
                          </button>{' '}
                          <button
                            className='btn btn-sm btn-danger'
                            data-comment={`pkgm-delete-${index}`}
                            onClick={() => requestDeletePackage(order.id, pkg.id)}
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
              <div className='label-cards-head' data-comment='pkg-label-head'>
                Label preview
              </div>
              <div className='label-cards' data-comment='pkg-label-cards'>
                {packages.map(pkg => (
                  <LabelCard order={order} pkg={pkg} key={pkg.id} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Overlay>
  )
}
