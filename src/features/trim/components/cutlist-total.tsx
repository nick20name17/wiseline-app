import { ModalHead, Overlay } from '@/components/shell/modal'

import { demoPo, qtyToMake, type BatchItem } from '../selectors'
import { DrawingThumb, EmptyState } from './bits'

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
}) => (
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
                <tr>
                  <th style={{ width: '96px' }}>Order</th>
                  <th>Customer</th>
                  <th style={{ width: '110px' }}>PO#</th>
                  <th style={{ width: '118px' }}>Product ID</th>
                  <th>Description</th>
                  <th style={{ width: '82px' }}>Qty ord.</th>
                  <th style={{ width: '64px' }}>Stock</th>
                  <th style={{ width: '88px' }}>Qty to mfg</th>
                  <th style={{ width: '64px' }}>Drawing</th>
                </tr>
              </thead>
              <tbody data-comment='cutlisttotal-tbody'>
                {items.map((item, index) => (
                  <tr data-comment={`cutlisttotal-row-${index}`} key={`${item.orderId}-${item.id}`}>
                    <td className='mono cell-order' data-comment={`cutlisttotal-order-${index}`}>
                      {item.orderNo}
                    </td>
                    <td className='trunc' data-comment={`cutlisttotal-cust-${index}`}>
                      {item.customer || '—'}
                    </td>
                    <td className='mono' data-comment={`cutlisttotal-po-${index}`}>
                      {demoPo(item.orderNo)}
                    </td>
                    <td className='mono' data-comment={`cutlisttotal-pid-${index}`}>
                      {item.productId}
                    </td>
                    <td className='trunc' data-comment={`cutlisttotal-desc-${index}`}>
                      {item.description}
                    </td>
                    <td className='mono' data-comment={`cutlisttotal-qtyord-${index}`}>
                      {item.qty}
                    </td>
                    <td className='mono' data-comment={`cutlisttotal-stock-${index}`}>
                      {item.fromStock ? item.fromStock : <span className='subtle'>—</span>}
                    </td>
                    <td className='mono' data-comment={`cutlisttotal-qty-${index}`}>
                      {qtyToMake(item)}
                    </td>
                    <td data-comment={`cutlisttotal-draw-${index}`}>
                      <DrawingThumb />
                    </td>
                  </tr>
                ))}
                <tr className='report-group-head' data-comment='cutlisttotal-totalrow'>
                  <td colSpan={7} data-comment='cutlisttotal-totallabel'>
                    Total
                  </td>
                  <td className='mono' data-comment='cutlisttotal-totalqty'>
                    {items.reduce((sum, item) => sum + qtyToMake(item), 0)}
                  </td>
                  <td data-comment='cutlisttotal-totaldraw' />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </Overlay>
)
