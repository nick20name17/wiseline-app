import { TableHead } from '@/components/ui/table'
import { cn } from 'cn'
import { useSortable } from '@dnd-kit/sortable'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { clampWidth, type Column } from './column'

type SortableHeadProps = {
  column: Column
  /** px this person dragged the column to; none keeps the declared width. */
  width?: number
  /** Each step of a drag, for the caller's `<col>` to follow without a render; `null` once it ends. */
  onResize: (width: number | null) => void
  /** The width to keep; `null` goes back to the declared one. */
  onResizeEnd: (width: number | null) => void
}

export const SortableHead = ({ column, width, onResize, onResizeEnd }: SortableHeadProps) => {
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
    const head = event.currentTarget.parentElement
    if (!head) return
    const start = event.clientX
    const from = head.getBoundingClientRect().width
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
      title='Drag to reorder column'
      // Clipped: a column dragged narrower than its heading would spill it over the next one.
      className={cn('overflow-hidden', width && 'w-(--col-width) min-w-(--col-width)')}
      style={width ? ({ '--col-width': `${width}px` } as CSSProperties) : undefined}
      {...listeners}
    >
      {/* The keyboard's way in: Space picks the column up, the arrows move it. A span and not a
          button, which would not inherit the heading's case; the attributes give it the role. */}
      <span
        ref={setActivatorNodeRef}
        className='rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
        {...attributes}
      >
        <span className={column.hideLabel ? 'sr-only' : undefined}>{column.label}</span>
      </span>
      {/* Pointer only: the keyboard already has the columns' order, and a stop per edge would
          double the header's tab stops. */}
      <span
        aria-hidden
        title='Drag to resize column, double-click to reset'
        className='absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none hover:bg-border'
        onPointerDown={resize}
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
