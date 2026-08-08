import { Inbox, MessageSquare, Scissors } from 'lucide-react'

import { GROUPS, groupSlug, noteState, priorityById, statusOf } from '../selectors'
import { rollformingStore, setActiveGroup } from '../store'

import type { LineItem, Order } from '../types'

/** The pieces every view of this page reuses. Each is one render function in the prototype. */

/**
 * The key is passed in wherever two views can show an empty state at once — the derived one is the
 * title slugged, and two tabs empty for the same reason would then claim the same `data-comment`.
 */
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

/**
 * The machine sub-tabs, above every view that is scoped to one rollformer. Slit Line is last and
 * carries the scissors: it is a process the material passes through, not a machine that rolls it.
 */
export const GroupTabs = ({ prefix }: { prefix: string }) => {
  const activeGroup = rollformingStore.get().activeGroup

  return (
    <div className='gtabs' data-comment={`${prefix}-gtabs`}>
      {['All', ...GROUPS].map(group => (
        <button
          key={group}
          className={`gtab ${activeGroup === group ? 'active' : ''}${group === 'Slit Line' ? ' slit' : ''}`}
          data-comment={`${prefix}-gtab-${groupSlug(group)}`}
          onClick={() => setActiveGroup(group)}
        >
          {group === 'Slit Line' ? <Scissors style={{ width: '14px', height: '14px' }} /> : null}
          {group}
        </button>
      ))}
    </div>
  )
}

/** A Worker sees the priority and works to it but cannot set it; it stays settable after release. */
export const PriorityCell = ({ order, readOnly }: { order: Order; readOnly?: boolean }) => {
  const priority = priorityById(order.priorityId)
  const locked = readOnly || rollformingStore.get().role === 'worker'

  return (
    <button
      className={`pri ${priority ? priority.cls : 'pri-none'}${locked ? ' readonly' : ''}`}
      data-pop-anchor
      data-comment={`pri-${order.id}`}
    >
      <span className='pri-dot' />
      {priority ? priority.name : 'Set priority'}
    </button>
  )
}

const noteClass = (state: string) =>
  state === 'unread' ? 'has-unread' : state === 'read' ? 'all-read' : ''

export const NoteButton = ({ order }: { order: Order }) => {
  const state = noteState(order.notes)

  return (
    <button
      className={`note-btn ${noteClass(state)}`}
      data-comment={`note-btn-${order.id}`}
      onClick={event => event.stopPropagation()}
      title='Order notes'
    >
      <MessageSquare style={{ width: '14px', height: '14px' }} />
      {state !== 'none' ? <span className='note-dot' /> : null}
    </button>
  )
}

/** Line item notes are the plant's own — Manager and Worker share them, EBMS never sees them. */
export const LineNoteButton = ({ item, comment }: { item: LineItem; comment: string }) => {
  const state = noteState(item.notes)

  return (
    <button
      className={`note-btn ${noteClass(state)}`}
      data-comment={comment}
      onClick={event => event.stopPropagation()}
      title='Line item notes'
    >
      <MessageSquare style={{ width: '14px', height: '14px' }} />
      {state !== 'none' ? <span className='note-dot' /> : null}
    </button>
  )
}

const STATUS: Record<string, [string, string]> = {
  stock: ['st-stock', 'Stock'],
  in_progress: ['st-inprogress', 'In Progress'],
  rolled: ['st-rolled', 'Rolled'],
  wrapped: ['st-wrapped', 'Wrapped']
}

/** A line says nothing about itself until the order is released, and a dash is that nothing. */
export const StatusPill = ({
  order,
  item,
  comment
}: {
  order: Order
  item: LineItem
  comment: string
}) => {
  const status = STATUS[statusOf(order, item)]

  if (!status)
    return (
      <span className='status st-none' data-comment={comment}>
        —
      </span>
    )

  const [cls, label] = status

  return (
    <span className={`status ${cls}`} data-comment={comment}>
      <span className='st-dot' />
      {label}
    </span>
  )
}
