import { TableHead } from '@/components/ui/table'
import { cn } from 'cn'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { clampWidth, type Column } from './column'

type SortableHeadProps = {
  column: Column
  /** px this person dragged the column to; none keeps the declared width. */
  width?: number
  /** A drag on the column's edge begins. */
  onResizeStart: () => void
  /** Each step of a drag, for the caller's `<col>` to follow without a render; `null` once it ends. */
  onResize: (width: number | null) => void
  /** The width to keep; `null` goes back to the declared one. */
  onResizeEnd: (width: number | null) => void
  /** The column sorts the table: `desc` is unset while another column leads. */
  sort?: { desc: boolean | undefined; toggle: () => void }
}

export const SortableHead = ({
  column,
  width,
  onResizeStart,
  onResize,
  onResizeEnd,
  sort
}: SortableHeadProps) => {
  // Where the press began: a press that moved was a drag, and its click must not sort as well.
  const pressedAt = useRef<number | null>(null)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
    isOver,
    index,
    activeIndex
  } = useSortable({ id: column.key })

  // The dragged column takes the target's index, so it lands on the side of it it came from past.
  const drop = isOver && !isDragging ? (activeIndex < index ? 'after' : 'before') : undefined

  const resize = (event: ReactPointerEvent<HTMLElement>) => {
    // The header's own pointer-down picks the column up to move it.
    event.stopPropagation()
    event.preventDefault()
    const handle = event.currentTarget
    const head = handle.parentElement
    if (!head) return
    // The pointer outruns the edge past a column's least or most width, and the line stays meanwhile.
    handle.dataset.resizing = ''
    const start = event.clientX
    const from = head.getBoundingClientRect().width
    onResizeStart()
    const at = (x: number) => clampWidth(column, from + x - start)
    // The header is set too: a table laid out by its content has no `<col>` to follow, and takes a
    // header's width only as a hint it drops once the table outgrows its box; a minimum it keeps.
    const move = (next: PointerEvent) => {
      head.style.width = head.style.minWidth = `${at(next.clientX)}px`
      onResize(at(next.clientX))
    }
    // A cancelled pointer (the OS took the touch, the window lost it) ends the drag unsaved.
    const end = (last: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      delete handle.dataset.resizing
      // Rendered before the drag's own widths go, so the column does not flash back for a frame.
      if (last.type === 'pointerup' && last.clientX !== start)
        flushSync(() => onResizeEnd(at(last.clientX)))
      // From here the saved width alone drives the column, and a change from another tab shows.
      clear(head)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const SortIcon = sort?.desc === undefined ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp

  const clear = (head: HTMLElement) => {
    head.style.removeProperty('width')
    head.style.removeProperty('min-width')
    onResize(null)
  }

  return (
    <TableHead
      ref={setNodeRef}
      data-dragging={isDragging || undefined}
      data-drop={drop}
      data-movable
      data-column={column.key}
      data-align={column.align}
      aria-sort={sort?.desc === undefined ? undefined : sort.desc ? 'descending' : 'ascending'}
      title={sort ? 'Click to sort, drag to reorder column' : 'Drag to reorder column'}
      className={cn(width && 'w-(--col-width) min-w-(--col-width)')}
      style={width ? ({ '--col-width': `${width}px` } as CSSProperties) : undefined}
      {...listeners}
      // Beside the sensors' own mouse and touch listeners, which it leaves alone.
      onPointerDown={event => void (pressedAt.current = event.clientX)}
      onClick={event => {
        const moved = pressedAt.current !== null && Math.abs(event.clientX - pressedAt.current) > 4
        pressedAt.current = null
        if (sort && !moved) sort.toggle()
      }}
    >
      {/* Clipped here and not on the heading, whose edge the resize handle reaches past: a column
          dragged narrower than its heading would spill it over the next one. The margin it gives
          back is room for the focus rings inside it. */}
      <span className='-m-1 block overflow-hidden p-1'>
        {/* The keyboard's way in: Space picks the column up, the arrows move it. A span and not a
            button, which would not inherit the heading's case; the attributes give it the role. */}
        <span
          ref={setActivatorNodeRef}
          className='rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
          {...attributes}
        >
          <span className={column.hideLabel ? 'sr-only' : undefined}>{column.label}</span>
        </span>
        {/* The keyboard's way to sort: Enter on the label picks the column up instead. Its click
            reaches the heading, which sorts. */}
        {sort ? (
          <button
            type='button'
            aria-label={`Sort by ${column.label}`}
            className='ml-1 inline-flex rounded-sm align-middle outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50'
          >
            <SortIcon className={sort.desc === undefined ? 'size-3 opacity-40' : 'size-3'} />
          </button>
        ) : null}
      </span>
      {/* Pointer only: the keyboard already has the columns' order, and a stop per edge would
          double the header's tab stops. The line lies along the column's right edge, against the
          rule, and shows while the pointer is on it or dragging it; its `::after` is the grip, wider
          than the line. Both stay inside the heading: a stuck heading is painted over the one
          before it, which would cover a grip reaching past its edge, as tablecn's does not. */}
      <span
        aria-hidden
        title='Drag to resize column, double-click to reset'
        className={cn(
          'absolute inset-y-0 right-0 z-10 w-0.75 cursor-col-resize touch-none bg-primary opacity-0 transition-opacity hover:opacity-100 data-resizing:opacity-100',
          'after:absolute after:inset-y-0 after:right-0 after:-left-2'
        )}
        onPointerDown={resize}
        // The click that ends a resize is not a sort.
        onClick={event => event.stopPropagation()}
        onDoubleClick={event => {
          event.stopPropagation()
          const head = event.currentTarget.parentElement
          if (head) clear(head)
          onResizeEnd(null)
        }}
      />
    </TableHead>
  )
}
