import { TableColumnContext } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { columnOrderStore, columnWidthStore, withNewColumns } from '@/lib/column-order'
import { closestCenter, DndContext, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import { dragAnnouncements, useDragSensors } from './drag'
import { clampWidth, leastWidth, type Column } from './column'
import type { Sort } from '@/lib/sort-rows'
import { SortableHead } from './sortable-head'
import {
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode
} from 'react'

/** A table whose columns move: the key its order is saved under, and its columns as declared. */
export type ColumnTable = { table: string; columns: Column[] }

/** The table's sort, for the headings of its `sortable` columns. */
export type ColumnSort = { sort: Sort<string>; onSort: (sort: Sort<string>) => void }

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
export const useColumnOrder = (definition: ColumnTable, sorting?: ColumnSort) => {
  const { order, cells } = useColumnCells(definition)
  const byKey = new Map(definition.columns.map(column => [column.key, column]))
  const sensors = useDragSensors()
  const widthStore = columnWidthStore(definition.table)
  const saved = useSyncExternalStore(widthStore.subscribe, widthStore.get)
  const widthOf = (key: string) => {
    const column = byKey.get(key)
    const width = saved?.[key]
    return column && !column.fixed && width ? clampWidth(column, width) : undefined
  }
  // A drag sets the `<col>` directly: a render a step would redraw every row of the table.
  const colEls = useRef(new Map<string, HTMLTableColElement>())
  // The columns with no width of their own that the drag in hand pinned where they stood.
  const pinned = useRef<Record<string, number>>({})

  // A fixed layout gives a column without a width what the others leave, and widened neighbours can
  // leave it nothing. `--fit-width` is the least the table can take and still leave each its minimum:
  // past it the table grows wider than its box, and scrolls. Once every column has a width and one of
  // them is this person's, the table is just as wide as its columns (`data-sized`), as an EBMS grid
  // is: a column dragged narrower leaves room at the right instead of widening the others.
  const fit = () => {
    const table = colEls.current.values().next().value?.closest('table')
    if (!table) return
    const keys = new Map([...colEls.current].map(([key, col]) => [col, key]))
    const all = [...table.querySelectorAll<HTMLTableColElement>(':scope > colgroup > col')]
    // Read from the markup alone: each measurement below lays the whole table out.
    const fixed = (col: HTMLTableColElement) => !!(col.className || col.style.width)
    const sized =
      all.every(fixed) &&
      all.some(col => col.style.width || col.style.getPropertyValue('--col-width'))
    let width = 0
    if (sized) {
      // A fixed table wider than its columns shares the rest out among them, and a `<col>` reports
      // the width it got, not the one it asked for; laid out at no width, the table is their sum.
      const { width: before, minWidth: least } = table.style
      table.style.width = table.style.minWidth = '0px'
      width = table.getBoundingClientRect().width
      Object.assign(table.style, { width: before, minWidth: least })
    } else
      for (const col of all)
        width += fixed(col)
          ? parseFloat(getComputedStyle(col).width) || 0
          : leastWidth(
              byKey.get(keys.get(col) ?? ''),
              table.querySelector(`th[data-column="${CSS.escape(keys.get(col) ?? '')}"]`)
            )
    table.style.setProperty('--fit-width', `${width}px`)
    table.toggleAttribute('data-sized', sized)
  }

  // Kevin's notes of 2026-11-02 (A9): dragging a column's edge changes that column alone. A column
  // with no width takes what the others leave, so it would give or take whatever the dragged one
  // does; the drag pins each such column at the width it has, and keeps those with its own.
  const pin = () => {
    pinned.current = {}
    for (const [key, col] of colEls.current) {
      const column = byKey.get(key)
      if (!column || col.className || col.style.width) continue
      // Its header, not the `<col>`: WebKit gives a `<col>` no box to measure.
      const head = col.closest('table')?.querySelector(`th[data-column="${CSS.escape(key)}"]`)
      if (!head) continue
      const width = clampWidth(column, head.getBoundingClientRect().width, leastWidth(column, head))
      col.style.width = `${width}px`
      pinned.current[key] = width
    }
  }
  const unpin = () => {
    for (const key of Object.keys(pinned.current))
      colEls.current.get(key)?.style.removeProperty('width')
    pinned.current = {}
  }
  // Every render: a saved width, a column moved or a row of cells in may each change it.
  useLayoutEffect(fit)

  // Read now, not at the render the drag began in: another tab may have saved a width since.
  const resized = (key: string, width: number | null) => {
    const rest = Object.fromEntries(
      Object.entries({ ...pinned.current, ...widthStore.get() }).filter(([other]) => other !== key)
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
      className={widthOf(key) ? 'w-(--col-width)' : byKey.get(key)?.width}
      style={widthOf(key) ? ({ '--col-width': `${widthOf(key)}px` } as CSSProperties) : undefined}
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
            width={widthOf(key)}
            sort={
              sorting && byKey.get(key)?.sortable
                ? {
                    desc: sorting.sort.key === key ? sorting.sort.desc : undefined,
                    toggle: () =>
                      sorting.onSort({
                        key,
                        desc: sorting.sort.key === key && !sorting.sort.desc
                      })
                  }
                : undefined
            }
            onResizeStart={pin}
            onResize={width => {
              const style = colEls.current.get(key)?.style
              if (width === null) {
                style?.removeProperty('width')
                unpin()
              } else if (style) style.width = `${width}px`
              fit()
            }}
            onResizeEnd={width => resized(key, width)}
          />
        ))}
      </SortableContext>
    </DndContext>
  )

  return { order, cols, headers, cells }
}
