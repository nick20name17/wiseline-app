import { useState } from 'react'
import { Printer } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { orderById } from '../selectors'
import { createNewPackages, shippingStore } from '../store'
import { openNewPkgKeypad, setNewPkgQty, showToast } from '../ui'

/** Which orders are getting extra packages, and how many each. */
export type NewPkgCtx = { orderIds: number[]; qty: Record<number, number> }

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫']

/**
 * How many packages to add, typed on a keypad rather than into a field — the people logging an extra
 * bundle are at a terminal on the floor, and this is the same pad the production screens use.
 */
export const NewPkgKeypad = ({
  ctx,
  orderId,
  onClose
}: {
  ctx: NewPkgCtx | null
  orderId: number | null
  onClose: () => void
}) => {
  const orders = useStore(shippingStore, state => state.orders)
  const order = orderById(orderId, orders)
  const [value, setValue] = useState(String(orderId != null ? (ctx?.qty[orderId] ?? 1) : 1))

  const press = (key: string) =>
    setValue(current =>
      key === '⌫' ? current.slice(0, -1) : (current + key).replace(/^0+(?=\d)/, '')
    )

  return (
    <Overlay
      id='overlay-newpkg-kp'
      comment='overlay-newpkg-kp'
      open={orderId != null}
      onClose={onClose}
    >
      <div
        className='modal'
        style={{ maxWidth: '260px' }}
        data-comment='newpkgkp-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='newpkgkp-head'
          titleComment='newpkgkp-title'
          descComment='newpkgkp-desc'
          title='Packages to add'
          desc={`Packages to add for ${order?.order ?? '—'}`}
          onClose={onClose}
        />
        <div className='modal-body' data-comment='newpkgkp-body'>
          <div
            className='keypad-display mono'
            id='newpkgkp-display'
            data-comment='newpkgkp-display'
          >
            {value || '0'}
          </div>
          <div className='keypad-grid' id='newpkgkp-grid' data-comment='newpkgkp-grid'>
            {KEYS.map((key, index) => (
              <button
                className='keypad-key'
                data-comment={`newpkgkp-key-${index}`}
                onClick={() => press(key)}
                key={key}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
        <div className='modal-foot' data-comment='newpkgkp-foot'>
          <button className='btn btn-ghost' data-comment='newpkgkp-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            data-comment='newpkgkp-enter'
            onClick={() => orderId != null && setNewPkgQty(orderId, parseInt(value, 10) || 0)}
          >
            Enter
          </button>
        </div>
      </div>
    </Overlay>
  )
}

/**
 * Extra packages logged against orders already scheduled onto a truck.
 *
 * Packages are the physical things the warehouse scans onto a truck; the line items an order expands
 * to are its contents, and the two are counted separately on purpose.
 */
export const NewPackageModal = ({
  ctx,
  onClose
}: {
  ctx: NewPkgCtx | null
  onClose: () => void
}) => {
  const orders = useStore(shippingStore, state => state.orders)
  const rows = (ctx?.orderIds ?? [])
    .map(id => orderById(id, orders))
    .filter((order): order is NonNullable<typeof order> => !!order)

  const create = () => {
    if (!ctx) return
    const barcodes = createNewPackages(
      ctx.orderIds.map(orderId => ({ orderId, qty: ctx.qty[orderId] ?? 0 }))
    )
    if (!barcodes.length) return

    showToast(`${barcodes.length} package(s) created & printed — ${barcodes.join(', ')}`)
    onClose()
  }

  return (
    <Overlay id='overlay-newpkg' comment='overlay-newpkg' open={!!ctx} onClose={onClose}>
      <div className='modal' data-comment='newpkg-modal' data-component='dialog'>
        <ModalHead
          comment='newpkg-head'
          titleComment='newpkg-title'
          descComment='newpkg-desc'
          title='New package'
          desc='Logs an extra package on the order and prints its barcode label.'
          onClose={onClose}
        />
        <div className='modal-body' id='newpkg-body' data-comment='newpkg-body'>
          <div className='table-wrap' data-comment='newpkg-tablewrap'>
            <div className='table-scroll'>
              <table className='grid' data-comment='newpkg-table' data-component='table'>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Order #</th>
                    <th>Customer</th>
                    <th style={{ width: '90px' }}>Existing</th>
                    <th style={{ width: '120px' }}>Add qty</th>
                  </tr>
                </thead>
                <tbody data-comment='newpkg-tbody'>
                  {rows.map(order => (
                    <tr data-comment={`newpkg-row-${order.id}`} key={order.id}>
                      <td className='cell-order' data-comment={`newpkg-order-${order.id}`}>
                        {order.order}
                      </td>
                      <td className='cell-cust trunc' data-comment={`newpkg-cust-${order.id}`}>
                        {order.customer}
                      </td>
                      <td className='cell-num' data-comment={`newpkg-existing-${order.id}`}>
                        {order.packages.length}
                      </td>
                      <td data-comment={`newpkg-qtycell-${order.id}`}>
                        <button
                          className='field-btn'
                          style={{ minWidth: '64px', justifyContent: 'center' }}
                          data-comment={`newpkg-qtybtn-${order.id}`}
                          onClick={() => openNewPkgKeypad(order.id)}
                        >
                          {ctx?.qty[order.id] ?? 0}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className='modal-foot' data-comment='newpkg-foot'>
          <button className='btn btn-ghost' data-comment='newpkg-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='newpkg-create'
            data-comment='newpkg-create'
            disabled={!ctx?.orderIds.some(id => (ctx.qty[id] ?? 0) > 0)}
            onClick={create}
          >
            <Printer style={{ width: '14px', height: '14px' }} />
            Create &amp; Print
          </button>
        </div>
      </div>
    </Overlay>
  )
}
