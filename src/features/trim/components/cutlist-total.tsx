import { useColumnOrder, type Column } from '@/components/shell/column-order'
import { ModalHead, Overlay } from '@/components/shell/modal'

import { demoPo, qtyToMake, type BatchItem } from '../selectors'
import { showToast } from '../ui'
import { DrawingThumb, EmptyState } from './bits'

/** N-166/#114 */
const DATA_COLUMNS: Column[] = [
  { key: 'order', label: 'Order', width: '96px' },
  { key: 'cust', label: 'Customer' },
  { key: 'po', label: 'PO#', width: '110px' },
  { key: 'pid', label: 'Product ID', width: '118px' },
  { key: 'desc', label: 'Description' },
  { key: 'qtyord', label: 'Qty ord.', width: '82px' },
  { key: 'stock', label: 'Stock', width: '64px' },
  { key: 'qty', label: 'Qty to mfg', width: '88px' },
  { key: 'draw', label: 'Drawing', width: '64px' }
]

/**
 * N-111/§206: what a consolidated Total is made of.
 *
 * Identical sizes collapse into one row on a cutlist so the floor cuts them together, which is right
 * for cutting and useless for answering «whose is this». The breakdown is that answer, so it carries
 * the order and the customer rather than repeating the size.
 */
export const CutlistTotal = ({
  items,
  onClose
}: {
  items: BatchItem[] | null
  onClose: () => void
}) => {
  const { order, headers, cells } = useColumnOrder('trim-cltotal', DATA_COLUMNS, {
    notify: showToast
  })
  // the label takes the first column that is not the figure's own, so dragging «Qty to mfg» to the
  // front moves the word «Total» along rather than losing it
  const labelKey = order.find(key => key !== 'qty')

  return (
    <Overlay
      id='overlay-cutlisttotal'
      comment='overlay-cutlisttotal'
      open={!!items}
      onClose={onClose}
    >
      <div className='modal wide' data-comment='cutlisttotal-modal' data-component='dialog'>
        <ModalHead
          comment='cutlisttotal-head'
          titleComment='cutlisttotal-title'
          descComment='cutlisttotal-desc'
          title='Orders using this size'
          desc='Consolidated rows on one cutlist/bendlist — the constituent orders behind this Total.'
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='cutlisttotal-body'
          data-comment='cutlisttotal-body'
          style={{ paddingBottom: '18px' }}
        >
          {!items?.length ? (
            <EmptyState
              title='No orders'
              text='This size has no constituent orders.'
              comment='cutlisttotal'
            />
          ) : (
            <div className='table-wrap' data-comment='cutlisttotal-wrap'>
              <table className='grid' data-comment='cutlisttotal-table'>
                <thead>
                  <tr>{headers}</tr>
                </thead>
                <tbody data-comment='cutlisttotal-tbody'>
                  {items.map((item, index) => (
                    <tr
                      data-comment={`cutlisttotal-row-${index}`}
                      key={`${item.orderId}-${item.id}`}
                    >
                      {cells({
                        order: (
                          <td
                            data-col='order'
                            className='mono cell-order'
                            data-comment={`cutlisttotal-order-${index}`}
                          >
                            {item.orderNo}
                          </td>
                        ),
                        cust: (
                          <td
                            data-col='cust'
                            className='trunc'
                            data-comment={`cutlisttotal-cust-${index}`}
                          >
                            {item.customer || '—'}
                          </td>
                        ),
                        po: (
                          <td
                            data-col='po'
                            className='mono'
                            data-comment={`cutlisttotal-po-${index}`}
                          >
                            {demoPo(item.orderNo)}
                          </td>
                        ),
                        pid: (
                          <td
                            data-col='pid'
                            className='mono'
                            data-comment={`cutlisttotal-pid-${index}`}
                          >
                            {item.productId}
                          </td>
                        ),
                        desc: (
                          <td
                            data-col='desc'
                            className='trunc'
                            data-comment={`cutlisttotal-desc-${index}`}
                          >
                            {item.description}
                          </td>
                        ),
                        qtyord: (
                          <td
                            data-col='qtyord'
                            className='mono'
                            data-comment={`cutlisttotal-qtyord-${index}`}
                          >
                            {item.qty}
                          </td>
                        ),
                        stock: (
                          <td
                            data-col='stock'
                            className='mono'
                            data-comment={`cutlisttotal-stock-${index}`}
                          >
                            {item.fromStock ? item.fromStock : <span className='subtle'>—</span>}
                          </td>
                        ),
                        qty: (
                          <td
                            data-col='qty'
                            className='mono'
                            data-comment={`cutlisttotal-qty-${index}`}
                          >
                            {qtyToMake(item)}
                          </td>
                        ),
                        draw: (
                          <td data-col='draw' data-comment={`cutlisttotal-draw-${index}`}>
                            <DrawingThumb />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {/* #114: the footer is built through the same order, so the total keeps sitting under
                    «Qty to mfg» wherever that column has been dragged to */}
                  <tr className='report-group-head' data-comment='cutlisttotal-totalrow'>
                    {cells(
                      Object.fromEntries(
                        order.map(key => [
                          key,
                          key === 'qty' ? (
                            <td
                              key={key}
                              data-col='qty'
                              className='mono'
                              data-comment='cutlisttotal-totalqty'
                            >
                              {items.reduce((sum, item) => sum + qtyToMake(item), 0)}
                            </td>
                          ) : key === labelKey ? (
                            <td key={key} data-col={key} data-comment='cutlisttotal-totallabel'>
                              Total
                            </td>
                          ) : (
                            <td
                              key={key}
                              data-col={key}
                              data-comment={
                                key === 'draw'
                                  ? 'cutlisttotal-totaldraw'
                                  : `cutlisttotal-total-${key}`
                              }
                            />
                          )
                        ])
                      )
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  )
}
