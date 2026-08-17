import { Inbox, MessageSquare, Scissors } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { GROUPS, groupSlug, noteState, priorityById, statusOf } from '../selectors'
import { usePopover } from '@/components/shell/pop'

import { rollformingStore, setActiveGroup, setPriority } from '../store'
import { openNotes } from '../ui'

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
  // read through the subscription, not `get()`: the compiler is free to skip a component whose props
  // did not change, and `prefix` never does — the tab strip then keeps the group it first rendered
  const activeGroup = useStore(rollformingStore, state => state.activeGroup)

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
  const role = useStore(rollformingStore, state => state.role)
  const priorities = useStore(rollformingStore, state => state.priorities)
  const priority = priorityById(order.priorityId, priorities)
  const { openPop, popNode } = usePopover()
  const locked = readOnly || role === 'worker'

  return (
    <>
      <button
        className={`pri ${priority ? priority.cls : 'pri-none'}${locked ? ' readonly' : ''}`}
        data-pop-anchor
        data-comment={`pri-${order.id}`}
        onClick={
          locked
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
        {priority ? priority.name : 'Set priority'}
      </button>
      {popNode}
    </>
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
      onClick={event => {
        event.stopPropagation()
        openNotes({ orderId: order.id, lineId: null })
      }}
      title='Order notes'
    >
      <MessageSquare style={{ width: '14px', height: '14px' }} />
      {state !== 'none' ? <span className='note-dot' /> : null}
    </button>
  )
}

/** Line item notes are the plant's own — Manager and Worker share them, EBMS never sees them. */
export const LineNoteButton = ({
  order,
  item,
  comment
}: {
  order: Order
  item: LineItem
  comment: string
}) => {
  const state = noteState(item.notes)

  return (
    <button
      className={`note-btn ${noteClass(state)}`}
      data-comment={comment}
      onClick={event => {
        event.stopPropagation()
        openNotes({ orderId: order.id, lineId: item.id })
      }}
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
