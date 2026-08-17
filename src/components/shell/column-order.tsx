import { Fragment, useRef, useState, useSyncExternalStore } from 'react'

import { columnOrder } from '@/store/shared/column-order'

import type { ReactNode } from 'react'

/**
 * `comment` is for a header that already carries a `data-comment` a review thread is anchored to:
 * the default is the prototype's `${table}-colh-${key}`, but an anchor that predates this must not be
 * renamed out from under the comments joined to it.
 */
export type Column = { key: string; label: string; width?: string; comment?: string }

/**
 * Movable table columns (N-166): drag a header, and the order is kept for that person.
 *
 * The prototype does this by moving DOM nodes around after each render — it rebuilds its markup from
 * strings, so appending the cells in a new order is the whole implementation. React cannot be handed a
 * table whose cells have been reparented behind its back, so the order is data here: the hook hands
 * back the keys in the order this viewer put them in, and the caller renders both its header row and
 * its body cells through it.
 *
 * Only data columns move. The checkbox and expander columns are service columns, have no `data-col`,
 * and stay where they are — the caller writes them before `headers`, as it always did.
 *
 * The `wl_colorder_<role>_<table>` key, the `${table}-colh-${key}` anchors, the drag classes and the
 * insert-at-the-target's-index semantics are all the prototype's; see `initColDrag` in home.html.
 */
export const useColumnOrder = (
  table: string,
  columns: Column[],
  { notify }: { notify?: (message: string) => void } = {}
) => {
  const store = columnOrder(table)
  const saved = useSyncExternalStore(store.subscribe, store.get)
  /**
   * The column being dragged is a ref and not state, the way the prototype keeps it in a closure: the
   * drop handler has to read what dragstart wrote, and state would only reach it once a render has
   * flushed in between. `dragged` mirrors it for the two classes, which are allowed to lag a frame.
   */
  const dragging = useRef<string | null>(null)
  const [dragged, setDragged] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const declared = columns.map(column => column.key)
  /**
   * A saved order outlives the table it was saved from: a column can be renamed or dropped, and a
   * release can add one. Saved keys keep their places, anything the table has since gained lands at
   * the end in declaration order, and anything it has lost is ignored rather than rendered blank.
   */
  const order = saved
    ? [
        ...saved.filter(key => declared.includes(key)),
        ...declared.filter(key => !saved.includes(key))
      ]
    : declared

  const clear = () => {
    dragging.current = null
    setDragged(null)
    setDropTarget(null)
  }

  const drop = (onto: string) => {
    const key = dragging.current
    clear()
    if (!key || key === onto) return

    const from = order.indexOf(key)
    const to = order.indexOf(onto)
    if (from < 0 || to < 0) return

    // the dragged column lands at the index the target held, which is the prototype's own splice pair
    const next = [...order]
    next.splice(to, 0, next.splice(from, 1)[0]!)
    store.set(next)
    notify?.('Column order saved')
  }

  const headers = order.map(key => {
    const column = columns.find(candidate => candidate.key === key)
    if (!column) return null

    return (
      <th
        key={key}
        data-col={key}
        draggable
        className={`col-move${dragged === key ? ' col-dragging' : ''}${
          dropTarget === key ? ' col-drop-target' : ''
        }`}
        data-comment={column.comment ?? `${table}-colh-${key}`}
        title='Drag to reorder column'
        style={column.width ? { width: column.width } : undefined}
        onDragStart={event => {
          event.dataTransfer.effectAllowed = 'move'
          dragging.current = key
          setDragged(key)
        }}
        onDragEnd={clear}
        onDragOver={event => {
          if (!dragging.current) return
          // without preventDefault the drop never fires — the browser rejects the target
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          setDropTarget(dragging.current === key ? null : key)
        }}
        onDrop={event => {
          event.preventDefault()
          drop(key)
        }}
      >
        {column.label}
      </th>
    )
  })

  /** A row's data cells, in this viewer's order. Cells the row does not have are simply absent. */
  const cells = (row: Record<string, ReactNode>) =>
    order.map(key => (key in row ? <Fragment key={key}>{row[key]}</Fragment> : null))

  return { order, headers, cells }
}
