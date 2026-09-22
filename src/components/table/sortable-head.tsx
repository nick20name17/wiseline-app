import { TableHead } from '@/components/ui/table'
import { useSortable } from '@dnd-kit/sortable'

export type Column = {
  key: string
  /** Also what the drag announcements call the column. */
  label: string
  /** The width class of the column's `<col>`; none takes what the others leave. */
  width?: string
  /** The column is obvious from its cells, so its heading is for screen readers only. */
  hideLabel?: boolean
}

export const SortableHead = ({ column }: { column: Column }) => {
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

  return (
    <TableHead
      ref={setNodeRef}
      data-dragging={isDragging || undefined}
      data-drop={drop}
      data-movable
      title='Drag to reorder column'
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
    </TableHead>
  )
}
