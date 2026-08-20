import { Factory } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { createStockWrapBatch, toggleStockWrapCheck, trimStore } from '../store'
import { askConfirm, closeConfirm, openPad, showToast } from '../ui'

import type { Order } from '../types'

const PRODUCTION_STATUS: Record<string, [string, string]> = {
  stock: ['st-stock', 'Stock'],
  not_started: ['st-notstarted', 'Not Started'],
  in_progress: ['st-inprogress', 'In Progress'],
  cut: ['st-cut', 'Cut'],
  bent: ['st-bent', 'Bent'],
  wrapped: ['st-wrapped', 'Wrapped'],
  bypassed: ['st-bypassed', 'Bypassed']
}

/** N-166/#114: this window's columns move too, and the move is kept for the person who made it. */
const DATA_COLUMNS: Column[] = [
  { key: 'qty', label: 'Qty Ordered', width: '92px' },
  { key: 'left', label: 'Left To Wrap', width: '104px' },
  { key: 'wrapped', label: 'Wrapped', width: '110px' },
  { key: 'mfg', label: 'Qty. Manufactured', width: '130px' },
  { key: 'status', label: 'Status', width: '116px' },
  { key: 'pid', label: 'ID', width: '116px' },
  { key: 'desc', label: 'Description' },
  { key: 'len', label: 'Length', width: '70px' }
]

/**
 * #185: a stock order's wrapping window is a different screen from a customer's, not a variant of it.
 * No location, no packages, no labels, no order-info footer — the heading just reads «Stock», and the
 * one action is Create Manufacturing Batch.
 */
export const StockWrapWindow = ({ order }: { order: Order }) => {
  const checkedIds = useStore(trimStore, state => state.stockWrapChecked as number[])
  const { headers, cells } = useColumnOrder('trim-swrap', DATA_COLUMNS, { notify: showToast })

  const picked = order.lineItems.filter(
    item => checkedIds.includes(item.id) && (item.wrapped || 0) > 0
  )

  return (
    <div className='bendlist' data-comment={`wrap-order-${order.id}`}>
      <table
        className='sub'
        data-comment={`swrap-table-${order.id}`}
        style={{ border: 'none', borderRadius: 0 }}
      >
        <thead>
          <tr>
            <th style={{ width: '44px' }} />
            {headers}
          </tr>
        </thead>
        <tbody>
          {order.lineItems.map((item, index) => {
            const key = `${order.id}-${index}`
            const manufactured = item.qtyManufactured ?? 0
            const wrapped = item.wrapped || 0
            /**
             * #219: a batch closes the row, whatever it was for. It used to take the *whole* quantity —
             * a partial batch left the rest wrappable — but the batch has already gone to EBMS, and
             * Kevin's rule is that the line stops being editable at that point: «This applies even if
             * the Qty. Manufactured is not equal to the Qty. Ordered.»
             */
            const done = manufactured > 0
            /**
             * #125: nothing can be wrapped before it has been bent, so the Wrapped keypad stays shut
             * until then. `setWrapped` does not move the status on — only the batch does — so a typo
             * is still correctable while the row is Bent.
             */
            const bent = item.status === 'bent'
            const left = Math.max(0, item.qty - wrapped - manufactured)
            const [cls, label] =
              PRODUCTION_STATUS[item.status ?? ''] ?? PRODUCTION_STATUS.not_started!

            return (
              <tr key={item.id} data-comment={`swrap-row-${key}`}>
                <td data-comment={`swrap-chkcell-${key}`}>
                  {done ? (
                    <span
                      className='mfg-ico'
                      data-comment={`swrap-mfgico-${key}`}
                      title='Manufacturing batch created'
                    >
                      <Factory style={{ width: '14px', height: '14px' }} />
                    </span>
                  ) : (
                    /* canvas: the checkbox becomes available the moment Wrapped has any value */
                    <input
                      type='checkbox'
                      className='chk'
                      data-comment={`swrap-chk-${key}`}
                      checked={wrapped > 0 && checkedIds.includes(item.id)}
                      disabled={wrapped <= 0}
                      title={
                        wrapped > 0
                          ? 'Include in the manufacturing batch'
                          : 'Enter a Wrapped amount first'
                      }
                      onChange={() => toggleStockWrapCheck(item.id)}
                    />
                  )}
                </td>
                {cells({
                  qty: (
                    <td data-col='qty' className='mono' data-comment={`swrap-qty-${key}`}>
                      {item.qty}
                    </td>
                  ),
                  left: (
                    <td data-col='left' className='mono' data-comment={`swrap-left-${key}`}>
                      {done ? <span className='subtle'>—</span> : left}
                    </td>
                  ),
                  wrapped: (
                    <td data-col='wrapped' data-comment={`swrap-wrapcell-${key}`}>
                      {done ? (
                        <span className='subtle' data-comment={`swrap-wrapblank-${key}`}>
                          —
                        </span>
                      ) : (
                        <button
                          className='field-btn'
                          style={{ minWidth: '56px', justifyContent: 'center' }}
                          data-comment={`swrap-wrapbtn-${key}`}
                          disabled={!bent}
                          title={
                            bent
                              ? 'Enter what has been wrapped'
                              : 'Available once the line is Bent'
                          }
                          onClick={() =>
                            openPad({ kind: 'wrap', orderId: order.id, lineId: item.id })
                          }
                        >
                          {wrapped}
                        </button>
                      )}
                    </td>
                  ),
                  mfg: (
                    <td data-col='mfg' className='mono' data-comment={`swrap-mfg-${key}`}>
                      {manufactured > 0 ? (
                        <>
                          <b>{manufactured}</b> / {item.qty}
                        </>
                      ) : (
                        <span className='subtle'>—</span>
                      )}
                    </td>
                  ),
                  status: (
                    <td data-col='status' data-comment={`swrap-st-${key}`}>
                      <span className={`status ${cls}`} data-comment={`swrap-stp-${key}`}>
                        <span className='st-dot' />
                        {label}
                      </span>
                    </td>
                  ),
                  pid: (
                    <td data-col='pid' className='mono' data-comment={`swrap-pid-${key}`}>
                      {item.productId}
                    </td>
                  ),
                  desc: (
                    <td data-col='desc' className='trunc' data-comment={`swrap-desc-${key}`}>
                      {item.description}
                    </td>
                  ),
                  len: (
                    <td
                      data-col='len'
                      className={`mono ${item.length !== 120 ? 'len-alert' : ''}`}
                      data-comment={`swrap-len-${key}`}
                    >
                      {item.length}&quot;
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/*
        #29: the canvas puts the word where a customer order puts its Customer / PO / Salesman block —
        under the lines, over the action — so the two windows differ exactly where they carry different
        information. It used to sit above the table as a heading.
      */}
      <div className='stockwrap-head' data-comment={`swrap-head-${order.id}`}>
        <span className='stockwrap-title' data-comment={`swrap-title-${order.id}`}>
          Stock
        </span>
        <span className='mono subtle' data-comment={`swrap-ono-${order.id}`}>
          {order.order}
        </span>
      </div>

      <div className='swrap-foot' data-comment={`swrap-foot-${order.id}`}>
        <button
          className='btn btn-primary'
          data-comment={`swrap-createbatch-${order.id}`}
          disabled={!picked.length}
          title={
            picked.length
              ? 'Push a manufacturing batch to EBMS for the checked rows'
              : 'Check at least one wrapped row'
          }
          onClick={() =>
            askConfirm(
              'Create manufacturing batch?',
              'This will create a manufacturing batch — are you sure the amounts in the Wrapped column are correct?',
              () => {
                closeConfirm()
                const finished = createStockWrapBatch(
                  order.id,
                  picked.map(item => item.id)
                )
                showToast(
                  finished
                    ? `Manufacturing batch pushed to EBMS · ${order.order} moved to Completed Orders`
                    : `Manufacturing batch pushed to EBMS (C_MFG) · ${picked.length} row${picked.length > 1 ? 's' : ''}`
                )
              },
              'Yes, Create Manufacturing Batch'
            )
          }
        >
          <Factory style={{ width: '14px', height: '14px' }} />
          Create Manufacturing Batch{picked.length ? ` (${picked.length})` : ''}
        </button>
      </div>
    </div>
  )
}
