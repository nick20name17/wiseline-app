import { toast } from '@/components/ui/toast'
import { columnOrderStore, withNewColumns } from '@/lib/column-order'
import { closestCenter, DndContext, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import { dragAnnouncements, useDragSensors } from './drag'
import { SortableHead, type Column } from './sortable-head'
import { Fragment, useSyncExternalStore, type ReactNode } from 'react'

export type { Column }

/** A table whose columns move: the key its order is saved under, and its columns as declared. */
export type ColumnTable = { table: string; columns: Column[] }

// The body cells do not travel with a header while it is in hand, so neither do the other headers:
// the drop mark says where it will land, and the whole column moves on drop.
const stayInPlace = () => null

/**
 * A table's column order as this person left it, and its row cells laid out in it. This is all a
 * row needs; the header, which is what moves the columns, takes `useColumnOrder`.
 */
export const useColumnCells = ({ table, columns }: ColumnTable) => {
  const store = columnOrderStore(table)
  const saved = useSyncExternalStore(store.subscribe, store.get)
  const declared = columns.map(column => column.key)
  const order = saved ? withNewColumns(saved, declared) : declared

  /** A row's data cells, in this person's order. A key the row leaves out renders nothing. */
  const cells = (row: Record<string, ReactNode>) =>
    order.map(key => (key in row ? <Fragment key={key}>{row[key]}</Fragment> : null))

  return { order, cells }
}

/**
 * Movable table columns: a header is dragged to a new place and the order is kept for this person,
 * per table, across reloads.
 *
 * The order is data: the caller renders its `<col>`s, header cells and body cells through it, so a
 * header and a table's rows can live in different components and still agree. Only the columns
 * passed in move; service columns such as a checkbox or an expander are written by the caller around
 * `headers` and `cells` and stay where they are.
 */
export const useColumnOrder = (definition: ColumnTable) => {
  const { order, cells } = useColumnCells(definition)
  const byKey = new Map(definition.columns.map(column => [column.key, column]))
  const sensors = useDragSensors()

  const announcements = dragAnnouncements({
    name: (id: UniqueIdentifier) => byKey.get(String(id))?.label,
    place: (id: UniqueIdentifier) => `${order.indexOf(String(id)) + 1} of ${order.length}`,
    noun: 'column',
    area: 'the header'
  })

  const move = ({ active, over }: DragEndEvent) => {
    const from = order.indexOf(String(active.id))
    const to = over ? order.indexOf(String(over.id)) : -1
    if (from < 0 || to < 0 || from === to) return
    columnOrderStore(definition.table).set(arrayMove(order, from, to))
    toast.add({ type: 'success', title: 'Column order saved' })
  }

  const cols = order.map(key => <col key={key} className={byKey.get(key)?.width} />)

  const headers = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      // Its live region is a div, which has no place inside the `<tr>` this renders into.
      accessibility={{ announcements, container: document.body }}
      onDragEnd={move}
    >
      <SortableContext items={order} strategy={stayInPlace}>
        {order.map(key => (
          <SortableHead key={key} column={byKey.get(key)!} />
        ))}
      </SortableContext>
    </DndContext>
  )

  return { order, cols, headers, cells }
}
