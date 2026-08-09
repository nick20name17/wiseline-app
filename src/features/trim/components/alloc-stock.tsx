import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { lineStatus } from '../selectors'
import { trimStore } from '../store'
import { EmptyState } from './bits'
import { colorOf } from './cutlist-coils'

import type { Order } from '../types'

/**
 * Stock that has been promised but not yet handed over.
 *
 * A row appears once an order is Reviewed with a Stock quantity on it, and drops out the moment that
 * line is Wrapped — at which point the pieces have physically left the shelf and the report would be
 * double-counting them. Colour first, because that is the shelf someone walks to.
 */
const allocatedRows = (orders: Order[]) => {
  const rows = new Map<
    string,
    { color: string; productId: string; description: string; qty: number }
  >()

  for (const order of orders) {
    if (!order.reviewed) continue

    for (const item of order.lineItems) {
      const qty = item.fromStock || 0
      if (qty <= 0) continue
      if ((item.status || lineStatus(order, item)) === 'wrapped') continue

      const color = colorOf(item.gaugeColour)
      const key = `${color}|${item.productId}`
      const row = rows.get(key) ?? {
        color,
        productId: item.productId,
        description: item.description,
        qty: 0
      }
      row.qty += qty
      rows.set(key, row)
    }
  }

  return [...rows.values()].sort(
    (a, b) => a.color.localeCompare(b.color) || a.productId.localeCompare(b.productId)
  )
}

export const AllocStock = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const orders = useStore(trimStore, state => state.orders)
  const rows = allocatedRows(orders)

  let lastColor: string | null = null

  return (
    <Overlay id='overlay-allocstock' comment='overlay-allocstock' open={open} onClose={onClose}>
      <div className='modal wide' data-comment='allocstock-modal' data-component='dialog'>
        <ModalHead
          comment='allocstock-head'
          titleComment='allocstock-title'
          descComment='allocstock-desc'
          title='Allocated Stock'
          desc="Live · Stock pulled on Reviewed orders that hasn't been Wrapped yet."
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='allocstock-body'
          data-comment='allocstock-body'
          style={{ paddingBottom: '18px' }}
        >
          {!rows.length ? (
            <EmptyState
              title='No stock allocated'
              text='Mark an order Reviewed with a Stock quantity to see it here.'
              comment='allocstock'
            />
          ) : (
            <div className='table-wrap' data-comment='allocstock-wrap'>
              <table className='grid' data-comment='allocstock-table'>
                <thead>
                  <tr>
                    <th>Colour</th>
                    <th style={{ width: '140px' }}>Product ID</th>
                    <th>Description</th>
                    <th style={{ width: '120px' }}>Qty allocated</th>
                  </tr>
                </thead>
                <tbody data-comment='allocstock-tbody'>
                  {rows.map((row, index) => {
                    const opensGroup = row.color !== lastColor
                    lastColor = row.color

                    return (
                      <Fragment key={`${row.color}|${row.productId}`}>
                        {opensGroup ? (
                          <tr
                            className='report-group-head'
                            data-comment={`allocstock-group-${index}`}
                          >
                            <td colSpan={4}>{row.color}</td>
                          </tr>
                        ) : null}
                        <tr data-comment={`allocstock-row-${index}`}>
                          <td data-comment={`allocstock-color-${index}`}>{row.color}</td>
                          <td className='mono' data-comment={`allocstock-pid-${index}`}>
                            {row.productId}
                          </td>
                          <td className='trunc' data-comment={`allocstock-desc-${index}`}>
                            {row.description}
                          </td>
                          <td className='mono' data-comment={`allocstock-qty-${index}`}>
                            {row.qty}
                          </td>
                        </tr>
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  )
}
