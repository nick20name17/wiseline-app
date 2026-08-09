import { Printer, Trash2 } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { deletePackage, trimStore } from '../store'
import { askConfirm, closeConfirm, showToast } from '../ui'

/**
 * The labels this order has printed (N-090).
 *
 * A deleted package stays in the list rather than disappearing: the label is already on a box
 * somewhere, and scanning it has to report a *deleted* package rather than an unknown one. So the row
 * is struck through and the barcode is marked voided.
 */
export const PackagesModal = ({
  orderId,
  onClose
}: {
  orderId: number | null
  onClose: () => void
}) => {
  const orders = useStore(trimStore, state => state.orders)
  const order = orderId == null ? null : orders.find(candidate => candidate.id === orderId)
  const packages = order?.packages ?? []

  return (
    <Overlay id='overlay-packages' comment='overlay-packages' open={!!order} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '600px' }}
        data-comment='pkg-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='pkg-head'
          titleComment='pkg-title'
          descComment='pkg-desc'
          title={`Packages${order ? ` · ${order.order}${order.type === 'stock' ? '' : ` · ${order.customer}`}` : ''}`}
          desc='Created labels for this order · reprint if a label is damaged (N-090).'
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='pkg-body'
          data-comment='pkg-body'
          style={{ paddingBottom: '18px' }}
        >
          {!packages.length ? (
            <div className='empty' data-comment='pkg-empty' style={{ padding: '36px 12px' }}>
              <p data-comment='pkg-empty-text'>No packages created yet.</p>
            </div>
          ) : (
            <table className='sub' data-comment='pkg-table'>
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Package</th>
                  <th>Contents</th>
                  <th style={{ width: '90px' }}>Location</th>
                  <th style={{ width: '190px' }} />
                </tr>
              </thead>
              <tbody data-comment='pkg-tbody'>
                {packages.map((pkg, index) => (
                  <tr
                    data-comment={`pkg-row-${index}`}
                    style={pkg.deleted ? { opacity: 0.5 } : undefined}
                    key={pkg.barcode}
                  >
                    <td className='mono' data-comment={`pkg-bc-${index}`}>
                      {pkg.barcode}
                      {pkg.deleted ? (
                        <>
                          {' '}
                          <span className='status st-none' data-comment={`pkg-del-${index}`}>
                            Deleted
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td
                      data-comment={`pkg-ct-${index}`}
                      style={pkg.deleted ? { textDecoration: 'line-through' } : undefined}
                    >
                      {pkg.contents}
                    </td>
                    <td className='mono muted' data-comment={`pkg-loc-${index}`}>
                      {pkg.deleted ? '—' : pkg.locName || '—'}
                    </td>
                    <td data-comment={`pkg-act-${index}`}>
                      {pkg.deleted ? (
                        <span
                          className='subtle'
                          data-comment={`pkg-tomb-${index}`}
                          style={{ fontSize: '11px' }}
                        >
                          Barcode voided
                        </span>
                      ) : (
                        <>
                          <button
                            className='btn btn-sm'
                            data-comment={`pkg-reprint-${index}`}
                            onClick={() => showToast(`Reprinted label ${pkg.barcode}`)}
                          >
                            <Printer style={{ width: '14px', height: '14px' }} />
                            Reprint
                          </button>{' '}
                          <button
                            className='btn btn-sm btn-danger'
                            data-comment={`pkg-delete-${index}`}
                            onClick={() =>
                              askConfirm(
                                `Delete package ${pkg.barcode}`,
                                'Voids this label (scanning it will report a deleted package) and returns its pieces to the Wrapping tab (Wrapped → Bent/Stock). This cannot be undone.',
                                () => {
                                  closeConfirm()
                                  deletePackage(order!.id, pkg.barcode)
                                  showToast(
                                    `Package ${pkg.barcode} deleted · pieces returned to Wrapping`
                                  )
                                },
                                'Yes, Delete Package'
                              )
                            }
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Overlay>
  )
}
