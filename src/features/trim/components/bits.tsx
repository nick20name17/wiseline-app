import { Inbox, MessageSquare } from 'lucide-react'

import { lineStatus, noteState, priorityById, productionStatus } from '../selectors'
import { trimStore } from '../store'
import { openNotes, requestToggleReviewed } from '../ui'

import type { LineItem, Order } from '../types'

/** The pieces every view of this page reuses. Each is one render function in the prototype. */

export const EmptyState = ({
  title,
  text,
  comment
}: {
  title: string
  text: string
  /** A caller may name the state instead: two screens can be empty for the same reason. */
  comment?: string
}) => {
  const key =
    comment ??
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
const openOrderNotes = (orderId: number) => openNotes({ orderId, lineId: null })

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
        ;(onOpen ?? openOrderNotes)(order.id)
      }}
      title='Order notes'
    >
      <MessageSquare style={{ width: '14px', height: '14px' }} />
      {state !== 'none' ? <span className='note-dot' /> : null}
    </button>
  )
}

const LINE_STATUS: Record<string, [string, string]> = {
  stock: ['st-stock', 'Stock'],
  not_started: ['st-notstarted', 'Not Started'],
  in_progress: ['st-inprogress', 'In Progress'],
  cut: ['st-cut', 'Cut'],
  bent: ['st-bent', 'Bent'],
  wrapped: ['st-wrapped', 'Wrapped'],
  bypassed: ['st-bypassed', 'Bypassed']
}

/** N-021: a line says nothing about itself until the order is released, and a dash is that nothing. */
export const LineStatusPill = ({ order, item }: { order: Order; item: LineItem }) => {
  const status = LINE_STATUS[lineStatus(order, item)]

  if (!status)
    return (
      <span className='status st-none' data-comment={`listatus-${item.id}`}>
        —
      </span>
    )

  const [cls, label] = status

  return (
    <span className={`status ${cls}`} data-comment={`listatus-${item.id}`}>
      <span className='st-dot' />
      {label}
    </span>
  )
}

const ORDER_STATUS: Record<string, [string, string]> = {
  not_started: ['st-notstarted', 'Not Started'],
  in_progress: ['st-inprogress', 'In Progress'],
  complete: ['st-wrapped', 'Complete']
}

/** N-019: Status stays empty until Release — no invented pre-release chip. */
export const OrderStatusPill = ({ order }: { order: Order }) => {
  if (!order.released)
    return (
      <span
        className='subtle'
        data-comment={`sch-ostat-empty-${order.id}`}
        style={{ fontSize: '11px' }}
      >
        —
      </span>
    )

  const production = productionStatus(order)

  if (order.bypassed && production !== 'complete')
    return (
      <span className='status st-bypassed' data-comment={`sch-ostat-rel-${order.id}`}>
        <span className='st-dot' />
        Bypassed
      </span>
    )

  const [cls, label] = ORDER_STATUS[production] as [string, string]

  return (
    <span className={`status ${cls}`} data-comment={`sch-ostat-rel-${order.id}`}>
      <span className='st-dot' />
      {label}
    </span>
  )
}

/**
 * Gate 1 (N-026): Reviewed cannot be switched on until every line that has to be made has a machine,
 * and the hint says which of the four gates is holding the order rather than leaving a dead control.
 */
export const ReviewedToggle = ({ order, gate1 }: { order: Order; gate1: boolean }) => {
  if (order.bypassed)
    return (
      <span
        className='subtle'
        data-comment={`sch-revlock-${order.id}`}
        style={{ fontSize: '11px' }}
      >
        N/A
      </span>
    )
  if (order.released)
    return (
      <span className='status st-notstarted' data-comment={`sch-revlock-${order.id}`}>
        Reviewed
      </span>
    )

  return (
    <span className='switch-wrap' data-comment={`sch-revwrap-${order.id}`}>
      <button
        className={`switch ${order.reviewed ? 'on' : ''}`}
        data-comment={`sch-revtoggle-${order.id}`}
        disabled={!gate1}
        aria-label='Reviewed'
        onClick={event => {
          event.stopPropagation()
          requestToggleReviewed(order)
        }}
      />
      {gate1 ? null : (
        <span className='switch-hint' data-comment={`sch-revhint-${order.id}`}>
          assign machines
        </span>
      )}
    </span>
  )
}

/** Drawing thumbnail (canvas 06/07). The real system links a trim profile; this is the placeholder. */
export const DrawingThumb = () => (
  <span className='draw-thumb' data-comment='draw-thumb' title='Drawing (placeholder)'>
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect x='3' y='3' width='18' height='18' rx='2' />
      <circle cx='9' cy='9' r='1.6' />
      <path d='M21 15l-5-5L5 21' />
    </svg>
  </span>
)
