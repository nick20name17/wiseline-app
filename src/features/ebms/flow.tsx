import {
  BellOff,
  Boxes,
  CalendarCheck,
  CalendarClock,
  CheckSquare,
  CircleDot,
  Disc,
  Factory,
  FilePlus,
  FileText,
  Flag,
  MessageSquare,
  MessageSquareText,
  Package,
  PackagePlus,
  Ruler,
  Settings2,
  SlidersHorizontal,
  User
} from 'lucide-react'

import type { ReactNode } from 'react'

/**
 * The three columns of the flow overview, as data.
 *
 * One icon carries the prototype's own class by hand: lucide renamed `check-square` after the
 * prototype pinned its CDN copy, and the class is what the structural diff reads.
 *
 * Every line here is a contract with EBMS — what it sends, what is sent back, and what deliberately
 * never leaves this app — so each keeps its own `data-comment` and its own wording. The list is
 * written out rather than generated because the *order* is the argument the page is making.
 */
export type FlowItem = {
  key: string
  icon: ReactNode
  title: string
  sub?: ReactNode
  /** Local-only items are plain text, with no bold lead. */
  plain?: boolean
}

export const IMPORT_ITEMS: FlowItem[] = [
  {
    key: '1',
    icon: <FileText className='flow-item-ico' data-comment='flow-import-item-1-ico' />,
    title: 'Sales Orders',
    sub: 'Entry/ship date, order #, customer, line items'
  },
  {
    key: '2',
    icon: <MessageSquare className='flow-item-ico' data-comment='flow-import-item-2-ico' />,
    title: 'Order Notes',
    sub: 'Author, email, timestamp, body — ack state tracked locally'
  },
  {
    key: '3',
    icon: <User className='flow-item-ico' data-comment='flow-import-item-3-ico' />,
    title: 'Customer Info'
  },
  {
    key: '4',
    icon: <Package className='flow-item-ico' data-comment='flow-import-item-4-ico' />,
    title: 'Product Catalog',
    sub: 'Product IDs like TRC8262'
  },
  {
    key: '5',
    icon: <Disc className='flow-item-ico' data-comment='flow-import-item-5-ico' />,
    title: 'Coils',
    sub: 'Imported with linear feet (N-107)'
  }
]

export const WRITEBACK_ITEMS: FlowItem[] = [
  {
    key: 'shipdate',
    icon: (
      <CalendarCheck className='flow-item-ico' data-comment='flow-writeback-item-shipdate-ico' />
    ),
    title: 'Ship date · SHIP_DATE',
    sub: 'Field-level PATCH on the order when the ship date is set / changed'
  },
  {
    key: '1',
    icon: <Factory className='flow-item-ico' data-comment='flow-writeback-item-1-ico' />,
    title: 'Manufactured qty · C_MFG',
    sub: 'Per line item — Qty Ordered − Stock written as C_MFG via a Details@delta PATCH on the order at Order Complete (N-073). Not a single batch call.'
  },
  {
    key: '2',
    icon: <SlidersHorizontal className='flow-item-ico' data-comment='flow-writeback-item-2-ico' />,
    title: 'Coil linear-feet adjustment',
    sub: 'Recomputed LF pushed back after thickness edit (N-108)'
  },
  {
    key: '3',
    icon: <PackagePlus className='flow-item-ico' data-comment='flow-writeback-item-3-ico' />,
    title: 'Stock Manufacturing batch',
    sub: 'Extra pieces made as stock, pushed as C_MFG (N-114)'
  }
]

export const LOCAL_ITEMS: FlowItem[] = [
  {
    key: '1',
    icon: <Ruler className='flow-item-ico' data-comment='flow-local-item-1-ico' />,
    title: 'Width / Description edits',
    plain: true
  },
  {
    key: '2',
    icon: <MessageSquareText className='flow-item-ico' data-comment='flow-local-item-2-ico' />,
    title: 'Line Item Notes',
    plain: true
  },
  {
    key: '3',
    icon: <Flag className='flow-item-ico' data-comment='flow-local-item-3-ico' />,
    title: 'Priority',
    plain: true
  },
  {
    key: '4',
    icon: <Settings2 className='flow-item-ico' data-comment='flow-local-item-4-ico' />,
    title: 'Machine assignment',
    plain: true
  },
  {
    key: '5',
    icon: <Boxes className='flow-item-ico' data-comment='flow-local-item-5-ico' />,
    title: '#From Stock / Stock column',
    plain: true
  },
  {
    key: '6',
    icon: (
      <CheckSquare
        className='flow-item-ico lucide-check-square'
        data-comment='flow-local-item-6-ico'
      />
    ),
    title: 'Reviewed toggle',
    plain: true
  },
  {
    key: '7',
    icon: <CalendarClock className='flow-item-ico' data-comment='flow-local-item-7-ico' />,
    title: 'Scheduling state',
    plain: true
  },
  {
    key: '8',
    icon: <FilePlus className='flow-item-ico' data-comment='flow-local-item-8-ico' />,
    title: 'Stock Orders',
    plain: true
  },
  {
    key: '9',
    icon: <BellOff className='flow-item-ico' data-comment='flow-local-item-9-ico' />,
    title: 'Note ack state',
    plain: true
  },
  {
    key: '10',
    icon: <CircleDot className='flow-item-ico' data-comment='flow-local-item-10-ico' />,
    title: 'Status (auto-calculated)',
    plain: true
  }
]

export const FlowList = ({ items, prefix }: { items: FlowItem[]; prefix: string }) => (
  <div className='flow-list' data-comment={`flow-${prefix}-list`}>
    {items.map(item => (
      <div className='flow-item' data-comment={`flow-${prefix}-item-${item.key}`} key={item.key}>
        {item.icon}
        <span className='flow-item-text' data-comment={`flow-${prefix}-item-${item.key}-text`}>
          {item.plain ? (
            item.title
          ) : (
            <>
              <b>{item.title}</b>
              {item.sub ? (
                <span
                  className='flow-item-sub'
                  data-comment={`flow-${prefix}-item-${item.key}-sub`}
                >
                  {item.sub}
                </span>
              ) : null}
            </>
          )}
        </span>
      </div>
    ))}
  </div>
)
