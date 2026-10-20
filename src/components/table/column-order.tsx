import { TableColumnContext } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { columnOrderStore, columnWidthStore, withNewColumns } from '@/lib/column-order'
import { closestCenter, DndContext, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import { dragAnnouncements, useDragSensors } from './drag'
import { SortableHead, type Column } from './sortable-head'
import { useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'

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
  const byKey = new Map(columns.map(column => [column.key, column]))

  /**
   * A row's data cells, in this person's order. A key the row leaves out renders nothing. Each cell
   * knows its column, so a card can label it.
   */
  const cells = (row: Record<string, ReactNode>) =>
    order.map(key => {
      const column = byKey.get(key)
      return key in row && column ? (
        <TableColumnContext key={key} value={column}>
          {row[key]}
        </TableColumnContext>
      ) : null
    })

  return { order, cells }
}

/**
 * Movable table columns: a header is dragged to a new place, or its edge to a new width, and both are
 * kept for this person, per table, across reloads.
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
  const widthStore = columnWidthStore(definition.table)
  const widths = useSyncExternalStore(widthStore.subscribe, widthStore.get)
  // A drag sets the `<col>` directly: a render a step would redraw every row of the table.
  const colEls = useRef(new Map<string, HTMLTableColElement>())

  // Read now, not at the render the drag began in: another tab may have saved a width since.
  const resized = (key: string, width: number | null) => {
    const rest = Object.fromEntries(
      Object.entries(widthStore.get() ?? {}).filter(([other]) => other !== key)
    )
    const next = width === null ? rest : { ...rest, [key]: width }
    widthStore.set(Object.keys(next).length ? next : null)
  }

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

  const cols = order.map(key => (
    <col
      key={key}
      ref={element => {
        if (!element) return
        colEls.current.set(key, element)
        return () => void colEls.current.delete(key)
      }}
      // A dragged width replaces the declared class rather than fighting it.
      className={widths?.[key] ? 'w-(--col-width)' : byKey.get(key)?.width}
      style={widths?.[key] ? ({ '--col-width': `${widths[key]}px` } as CSSProperties) : undefined}
    />
  ))

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
          <SortableHead
            key={key}
            column={byKey.get(key)!}
            width={widths?.[key]}
            onResize={width => {
              const style = colEls.current.get(key)?.style
              if (width === null) style?.removeProperty('width')
              else if (style) style.width = `${width}px`
            }}
            onResizeEnd={width => resized(key, width)}
          />
        ))}
      </SortableContext>
    </DndContext>
  )

  return { order, cols, headers, cells }
}
