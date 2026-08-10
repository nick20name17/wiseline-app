import { useState } from 'react'
import { CheckCheck, Lock, Printer, Trash2 } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { leftToPackage, lineCoilReady, unitWeight } from '../selectors'
import { createPackages, MAX_PKG_WEIGHT, rollformingStore } from '../store'
import { askConfirm, closeConfirm, openPad, showToast } from '../ui'
import { LineNoteButton } from './bits'

/**
 * What goes into one box, line by line.
 *
 * A line whose units are not all assigned a Supplier and Coil Number cannot be packaged: the label
 * would name a coil nobody chose. The weight limit is soft — a heavy box is a real box, so it asks
 * rather than refuses — and it only flags a line packaged in full, since a partial box is not the one
 * that will be lifted.
 */
export const PackageModal = ({
  orderId,
  onClose
}: {
  orderId: number | null
  onClose: () => void
}) => {
  const orders = useStore(rollformingStore, state => state.orders)
  const order = orders.find(candidate => candidate.id === orderId)
  const [lines, setLines] = useState<Record<number, number>>({})

  const limit = MAX_PKG_WEIGHT
  const picked = Object.entries(lines).filter(([, qty]) => qty > 0)
  const totalWeight = order
    ? picked.reduce((total, [lineId, qty]) => {
        const item = order.lineItems.find(candidate => candidate.id === Number(lineId))
        return total + (item ? qty * unitWeight(item) : 0)
      }, 0)
    : 0
  const overLines = order
    ? order.lineItems.filter(item => {
        const qty = lines[item.id] || 0
        return qty > 0 && qty === leftToPackage(order, item) && qty * unitWeight(item) > limit
      })
    : []

  const create = () => {
    if (!order || !picked.length) return

    const proceed = () => {
      createPackages(
        order.id,
        picked.map(([lineId, qty]) => [Number(lineId), qty])
      )
      setLines({})
      onClose()
      showToast(`Package(s) created & label printed · ${picked.length} line(s)`)
    }

    if (totalWeight > limit)
      return askConfirm(
        'Package over weight limit',
        `This package is ~${totalWeight} lb, over the ${limit} lb soft limit. Continue anyway?`,
        () => {
          proceed()
          closeConfirm()
        }
      )

    proceed()
  }

  return (
    <Overlay id='overlay-pkg' comment='overlay-pkg' open={!!order} onClose={onClose}>
      <div className='modal wide' data-comment='pkg-modal' data-component='dialog'>
        <ModalHead
          comment='pkg-head'
          titleComment='pkg-title'
          descComment='pkg-desc'
          title={order ? `Create Package · ${order.order}` : 'Create Package'}
          desc='Auto Fill or manually enter pieces to package per line item.'
          onClose={onClose}
        />
        <div className='modal-body' id='pkg-body' data-comment='pkg-body'>
          {order ? (
            <table
              className='sub'
              data-comment='pkg-table'
              data-component='table'
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>ID</th>
                  <th style={{ width: '95px' }}>Description</th>
                  <th style={{ width: '64px' }}>Qty Ord.</th>
                  <th style={{ width: '64px' }}>Stock</th>
                  <th style={{ width: '64px' }}>To Roll</th>
                  <th style={{ width: '64px' }}>Left</th>
                  <th style={{ width: '80px' }}>Packaging</th>
                  <th style={{ width: '44px' }}>Notes</th>
                  <th style={{ width: '150px' }} />
                </tr>
              </thead>
              <tbody data-comment='pkg-tbody'>
                {order.lineItems.map((item, index) => {
                  const left = leftToPackage(order, item)
                  const coilReady = lineCoilReady(item)
                  const qty = lines[item.id] || 0
                  const over = qty > 0 && qty === left && qty * unitWeight(item) > limit

                  return (
                    <tr
                      key={item.id}
                      className={over ? 'pkg-row-over' : ''}
                      data-comment={`pkg-row-${index}`}
                    >
                      <td className='mono trunc' data-comment={`pkg-pid-${index}`}>
                        {item.profile}
                      </td>
                      <td className='trunc' data-comment={`pkg-desc-${index}`}>
                        {item.gauge}ga {item.color}
                      </td>
                      <td className='mono' data-comment={`pkg-ordqty-${index}`}>
                        {item.qty}
                      </td>
                      <td className='mono' data-comment={`pkg-stock-${index}`}>
                        {item.fromStock || 0}
                      </td>
                      <td className='mono' data-comment={`pkg-toroll-${index}`}>
                        {Math.max(0, item.qty - (item.fromStock || 0))}
                      </td>
                      <td className='mono' data-comment={`pkg-left-${index}`}>
                        {left}
                      </td>
                      <td data-comment={`pkg-packaging-${index}`}>
                        {left <= 0 ? (
                          <span className='subtle' style={{ fontSize: '11px' }}>
                            Done
                          </span>
                        ) : !coilReady ? (
                          <span
                            className='lock-tag'
                            data-comment={`pkg-coilblock-${index}`}
                            title='Assign a Supplier and Coil Number to every unit before packaging'
                          >
                            <Lock style={{ width: '14px', height: '14px' }} />
                            coil pending
                          </span>
                        ) : (
                          <button
                            className='pkg-qty-btn'
                            data-comment={`pkg-qtybtn-${index}`}
                            onClick={() =>
                              openPad({
                                kind: 'pkg',
                                lineId: item.id,
                                profile: item.profile,
                                max: left,
                                value: qty,
                                onEnter: entered =>
                                  setLines(current => ({ ...current, [item.id]: entered }))
                              })
                            }
                          >
                            {qty}
                          </button>
                        )}
                      </td>
                      <td data-comment={`pkg-notes-${index}`}>
                        <LineNoteButton order={order} item={item} comment={`pkg-note-${index}`} />
                      </td>
                      <td data-comment={`pkg-act-${index}`}>
                        {left > 0 && coilReady ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className='btn btn-sm'
                              style={{ gap: '5px' }}
                              title='Auto Fill — package all remaining'
                              data-comment={`pkg-autofill-${index}`}
                              onClick={() => setLines(current => ({ ...current, [item.id]: left }))}
                            >
                              <CheckCheck
                                style={{ width: '14px', height: '14px', color: 'var(--success)' }}
                              />
                              Fill
                            </button>
                            <button
                              className='btn btn-sm'
                              style={{ gap: '5px' }}
                              title='Clear'
                              data-comment={`pkg-clear-${index}`}
                              onClick={() => setLines(current => ({ ...current, [item.id]: 0 }))}
                            >
                              <Trash2
                                style={{ width: '14px', height: '14px', color: 'var(--danger)' }}
                              />
                              Clear
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : null}
        </div>
        <div className='modal-foot' data-comment='pkg-foot'>
          <span className='toolbar-info' id='pkg-weight-info' data-comment='pkg-weight-info'>
            {totalWeight ? (
              <>
                Package weight ≈ <b>{totalWeight} lb</b>
                {overLines.length ? (
                  <>
                    {' '}
                    <span className='pkg-weight-flag'>· over {limit} lb limit</span>
                  </>
                ) : null}
              </>
            ) : null}
          </span>
          <div className='toolbar-spacer' data-comment='pkg-foot-spacer' />
          <button className='btn btn-ghost' data-comment='pkg-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='pkg-create-btn'
            data-comment='pkg-create'
            disabled={!picked.length}
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
