import { Inbox, MessageSquare } from 'lucide-react'

import { noteState, priorityById } from '../selectors'
import { trimStore } from '../store'

import type { Order } from '../types'

/** The pieces every view of this page reuses. Each is one render function in the prototype. */

export const EmptyState = ({ title, text }: { title: string; text: string }) => {
  const key = title
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

/**
 * A Worker sees the priority and works to it but cannot set it (N-057). Releasing an order no longer
 * locks it either (#184) — a Manager can re-prioritise work already on the floor.
 */
export const PriorityCell = ({
  order,
  onOpen
}: {
  order: Order
  onOpen?: (event: React.MouseEvent, order: Order) => void
}) => {
  const priority = priorityById(order.priorityId)
  const readOnly = trimStore.get().role === 'worker'

  return (
    <button
      data-comment={`priority-${order.id}`}
      className={`pri ${priority ? priority.cls : 'pri-none'}${readOnly ? ' readonly' : ''}`}
      data-pop-anchor
      onClick={readOnly ? undefined : event => onOpen?.(event, order)}
    >
      <span className='pri-dot' />
      {priority ? priority.name : 'Set priority'}
    </button>
  )
}

/** A stock order has no EBMS counterpart and so no order notes — it shows a dash, not an empty button. */
export const NoteButton = ({
  order,
  onOpen
}: {
  order: Order
  onOpen?: (orderId: number) => void
}) => {
  if (order.type === 'stock')
    return (
      <span className='subtle' data-comment={`note-na-${order.id}`} style={{ fontSize: '11px' }}>
        —
      </span>
    )

  const state = noteState(order.notes)

  return (
    <button
      className={`note-btn ${state === 'unread' ? 'has-unread' : state === 'read' ? 'all-read' : ''}`}
      data-comment={`note-btn-${order.id}`}
      onClick={event => {
        event.stopPropagation()
        onOpen?.(order.id)
      }}
      title='Order notes'
    >
      <MessageSquare style={{ width: '14px', height: '14px' }} />
      {state !== 'none' ? <span className='note-dot' /> : null}
    </button>
  )
}
