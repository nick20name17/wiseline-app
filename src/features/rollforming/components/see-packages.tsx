import { Printer, Trash2 } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { locName } from '../selectors'
import { deletePackage, rollformingStore } from '../store'
import { askConfirm, closeConfirm, showToast } from '../ui'

/** Every package printed for an order, including the deleted ones — a printed label still exists. */
export const SeePackagesModal = ({
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
    <Overlay id='overlay-seepkg' comment='overlay-seepkg' open={!!order} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '600px' }}
        data-comment='seepkg-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='seepkg-head'
          titleComment='seepkg-title'
          descComment='seepkg-desc'
          title={
            order
              ? `Packages · ${order.order}${order.customer !== '—' ? ` · ${order.customer}` : ''}`
              : 'Packages'
          }
          desc='Packages created for this order.'
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='seepkg-body'
          data-comment='seepkg-body'
          style={{ paddingBottom: '18px' }}
        >
          {!packages.length ? (
            <div className='empty' data-comment='seepkg-empty' style={{ padding: '36px 12px' }}>
              <p data-comment='seepkg-empty-text'>No packages created yet.</p>
            </div>
          ) : (
            <table className='sub' data-comment='seepkg-table' data-component='table'>
              <thead>
                <tr>
                  <th style={{ width: '140px' }}>Package #</th>
                  <th style={{ width: '60px' }}>Qty</th>
                  <th>Description</th>
                  <th style={{ width: '90px' }}>Location</th>
                  <th style={{ width: '160px' }} />
                </tr>
              </thead>
              <tbody data-comment='seepkg-tbody'>
                {packages.map((pkg, index) => {
                  const item = order?.lineItems.find(candidate => candidate.id === pkg.lineId)

                  if (pkg.deleted)
                    return (
                      <tr data-comment={`seepkg-row-${index}`} key={pkg.barcode}>
                        <td className='mono muted' data-comment={`seepkg-bc-${index}`}>
                          {pkg.barcode}
                        </td>
                        <td className='muted' colSpan={4} data-comment={`seepkg-del-${index}`}>
                          Deleted — barcode invalid (scanning shows “this package has been deleted”)
                        </td>
                      </tr>
                    )

                  return (
                    <tr data-comment={`seepkg-row-${index}`} key={pkg.barcode}>
                      <td className='mono' data-comment={`seepkg-bc-${index}`}>
                        {pkg.barcode}
                      </td>
                      <td className='mono' data-comment={`seepkg-qty-${index}`}>
                        {pkg.qty}
                      </td>
                      <td className='trunc' data-comment={`seepkg-desc-${index}`}>
                        {item ? `${item.profile} · ${item.gauge}ga ${item.color}` : '—'}
                      </td>
                      <td className='mono muted' data-comment={`seepkg-loc-${index}`}>
                        {pkg.locId ? locName(pkg.locId, locations) : '—'}
                      </td>
                      <td data-comment={`seepkg-act-${index}`}>
                        <div className='act-cell'>
                          <button
                            className='btn btn-sm'
                            data-comment={`seepkg-reprint-${index}`}
                            onClick={() => showToast(`Reprinted label ${pkg.barcode}`)}
                          >
                            <Printer style={{ width: '14px', height: '14px' }} />
                            Reprint
                          </button>
                          <button
                            className='btn btn-sm btn-danger'
                            data-comment={`seepkg-delete-${index}`}
                            onClick={() =>
                              askConfirm(
                                'Delete this package?',
                                'Puts the pieces back into Left To Package. The barcode becomes invalid — scanning it later shows “this package has been deleted”.',
                                () => {
                                  if (order) deletePackage(order.id, pkg.seq)
                                  closeConfirm()
                                }
                              )
                            }
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Overlay>
  )
}
