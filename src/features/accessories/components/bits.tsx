import { Inbox, MessageSquare, Package, Truck } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { usePopover } from '@/components/shell/pop'

import { fmtDate } from '../format'
import { itemStatus, noteState, orderPkgStatus, priorityById, STATUS_MAP } from '../selectors'
import { accessoriesStore, setPriority } from '../store'
import { openNotes } from '../ui'

import type { LineItem, Order } from '../types'

/** The pieces every view of this page reuses. Each is one render function in the prototype. */

export const EmptyState = ({
  title,
  text,
  commentKey
}: {
  title: string
  text: string
  commentKey?: string
}) => {
  const key =
    commentKey ??
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  return (
    <div className='table-wrap' data-comment={`empty-wrap-${key}`}>
      <div className='empty' data-comment={`empty-state-${key}`}>
        <Inbox data-comment={`empty-icon-${key}`} className='empty-ico' />
        <h3 data-comment={`empty-title-${key}`}>{title}</h3>
        <p data-comment={`empty-text-${key}`}>{text}</p>
      </div>
    </div>
  )
}

/** Priority is the Manager's; a Worker reads it and works to it. */
export const PriorityCell = ({ order }: { order: Order }) => {
  const role = useStore(accessoriesStore, state => state.role)
  const priorities = useStore(accessoriesStore, state => state.priorities)
  const { openPop, popNode } = usePopover()
  const readOnly = role === 'worker'
  const priority = priorityById(order.priorityId, priorities)

  return (
    <>
      <button
        className={`pri ${priority ? priority.cls : 'pri-none'}${readOnly ? ' readonly' : ''}`}
        {...(readOnly ? {} : { 'data-pop-anchor': true })}
        data-comment={`pri-${order.id}`}
        onClick={
          readOnly
            ? undefined
            : event => {
                event.stopPropagation()
                openPop<number>(
                  event.currentTarget,
                  [
                    ...priorities.map(entry => ({
                      label: entry.name,
                      value: entry.id,
                      dot: `var(--${entry.cls})`
                    })),
                    { label: 'No priority', value: 0, dot: 'var(--text-subtle)' }
                  ],
                  value => setPriority(order.id, value || null),
                  order.priorityId ?? 0
                )
              }
        }
      >
        <span className='pri-dot' />
        {priority ? priority.name : 'No priority'}
      </button>
      {popNode}
    </>
  )
}

export const ShipViaCell = ({ order }: { order: Order }) =>
  order.shipVia === 'Pickup' ? (
    <span className='chip' data-comment={`shipvia-${order.id}`}>
      <Package style={{ width: '14px', height: '14px' }} />
      Pickup
    </span>
  ) : (
    <span className='chip' data-comment={`shipvia-${order.id}`}>
      <Truck style={{ width: '14px', height: '14px' }} />
      Delivery
    </span>
  )

const noteClass = (state: string) =>
  state === 'unread' ? 'has-unread' : state === 'read' ? 'all-read' : ''

export const OrderNoteButton = ({ order }: { order: Order }) => {
  const state = noteState(order.orderNotes)

  return (
    <button
      className={`note-btn ${noteClass(state)}`}
      data-comment={`note-btn-${order.id}`}
      title='Order notes'
      onClick={event => {
        event.stopPropagation()
        openNotes({ orderId: order.id, lineId: null })
      }}
    >
      <MessageSquare style={{ width: '14px', height: '14px' }} />
      {state !== 'none' ? <span className='note-dot' /> : null}
    </button>
  )
}

/**
 * `commentKey` rather than a context prefix, because the Packaging table names this same button
 * `li-notebtn-<id>` while the scheduling views name it `<ctx>-linote-<id>` — and the anchor is what a
 * review comment is pinned to, so it cannot be regularised.
 */
export const LineNoteButton = ({
  item,
  orderId,
  commentKey
}: {
  item: LineItem
  orderId: number
  commentKey: string
}) => {
  const state = noteState(item.notes)

  return (
    <button
      className={`note-btn ${noteClass(state)}`}
      data-comment={commentKey}
      title='Line item notes'
      onClick={event => {
        event.stopPropagation()
        openNotes({ orderId, lineId: item.id })
      }}
    >
      <MessageSquare style={{ width: '14px', height: '14px' }} />
      {state !== 'none' ? <span className='note-dot' /> : null}
    </button>
  )
}

export const OrderStatusPill = ({ order }: { order: Order }) => {
  const [cls, label] = STATUS_MAP[orderPkgStatus(order)] as [string, string]

  return (
    <span className={`status ${cls}`} data-comment={`ord-status-${order.id}`}>
      <span className='st-dot' />
      {label}
    </span>
  )
}

export const ItemStatusPill = ({ item }: { item: LineItem }) => {
  const [cls, label] = STATUS_MAP[itemStatus(item)] as [string, string]

  return (
    <span className={`status ${cls}`} data-comment={`item-status-${item.id}`}>
      <span className='st-dot' />
      {label}
    </span>
  )
}

export const DetailField = ({
  label,
  value,
  commentKey
}: {
  label: string
  value: string
  commentKey: string
}) => (
  <div className='detail-field' data-comment={commentKey}>
    <span className='detail-label'>{label}</span>
    <span className='detail-val'>{value}</span>
  </div>
)

/** The four-and-three field block both scheduling views open an order onto. */
export const SchedDetailBar = ({ order, ctx }: { order: Order; ctx: string }) => (
  <div className='detail-bar' data-comment={`${ctx}-detailbar-${order.id}`}>
    <div className='detail-col' data-comment={`${ctx}-col1-${order.id}`}>
      <DetailField label='Customer' value={order.customer} commentKey={`${ctx}-cust-${order.id}`} />
      <DetailField
        label='Order #'
        value={order.orderNumber}
        commentKey={`${ctx}-ono-${order.id}`}
      />
      <DetailField label='PO #' value={order.po || '—'} commentKey={`${ctx}-po-${order.id}`} />
      <DetailField
        label='Salesman'
        value={order.salesman || '—'}
        commentKey={`${ctx}-sales-${order.id}`}
      />
    </div>
    <div className='detail-col' data-comment={`${ctx}-col2-${order.id}`}>
      <DetailField
        label='Ship Via'
        value={order.shipVia}
        commentKey={`${ctx}-shipvia-${order.id}`}
      />
      <DetailField
        label='Truck'
        value={truckOrDash(order)}
        commentKey={`${ctx}-truck-${order.id}`}
      />
      <div className='detail-field' data-comment={`${ctx}-fpri-${order.id}`}>
        <span className='detail-label'>Priority</span>
        <PriorityCell order={order} />
      </div>
    </div>
  </div>
)

const truckOrDash = (order: Order) => (order.shipVia === 'Pickup' ? 'N/A' : order.truck || '—')

/** The day heading the Packaging list breaks on, with its own counts on the right. */
export const DateSepRow = ({
  iso,
  colSpan,
  right
}: {
  iso: string
  colSpan: number
  right?: React.ReactNode
}) => (
  <tr className='date-sep-row' data-comment={`datesep-${iso}`}>
    <td colSpan={colSpan}>
      <div className='date-sep' data-comment={`datesep-label-${iso}`}>
        <span data-comment={`datesep-text-${iso}`}>{fmtDate(iso)}</span>
        {right}
      </div>
    </td>
  </tr>
)
