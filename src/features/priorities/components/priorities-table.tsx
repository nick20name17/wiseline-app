import { dragAnnouncements, useDragSensors } from '@/components/table/drag'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  type UniqueIdentifier
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from 'cn'
import { GripVertical } from 'lucide-react'
import { useState, type CSSProperties, type SyntheticEvent } from 'react'
import { useReorderPriorities, type Priority } from '../api'
import { reorder } from '../lib/reorder'
import { PriorityActions } from './priority-actions'

type PrioritiesTableProps = {
  /** One department's board, top of the hierarchy first. */
  priorities: Priority[]
  /** The department on screen, where an edited priority with none is offered. */
  departmentId: number
  isPending: boolean
  /** A row the viewer may not change is shown without its grip, Edit or Delete. */
  canChange: (priority: Priority) => boolean
}

type SortableRowProps = {
  priority: Priority
  /** Its place in its own hierarchy: 1 sorts above every other p1 (495,64). */
  rank: number
  departmentId: number
  disabled: boolean
  readOnly: boolean
}

/**
 * Whether a press on a row may pick it up. Rows pick up anywhere, as on the original, except from
 * their Edit and Delete buttons, which a slightly moving click or a held finger would otherwise
 * drag. React bubbles events out of portals too, so a press inside a row's dialog must not either.
 */
const startsDrag = ({ currentTarget, target }: SyntheticEvent) =>
  target instanceof Element &&
  currentTarget.contains(target) &&
  !target.closest('button:not([data-grip]), a, input')

class RowMouseSensor extends MouseSensor {
  static override activators = [
    {
      eventName: 'onMouseDown' as const,
      handler: (...args: Parameters<(typeof MouseSensor.activators)[number]['handler']>) =>
        startsDrag(args[0]) && MouseSensor.activators[0]!.handler(...args)
    }
  ]
}

class RowTouchSensor extends TouchSensor {
  static override activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: (...args: Parameters<(typeof TouchSensor.activators)[number]['handler']>) =>
        startsDrag(args[0]) && TouchSensor.activators[0]!.handler(...args)
    }
  ]
}

const SortableRow = ({ priority, rank, departmentId, disabled, readOnly }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: priority.id, disabled })

  return (
    <TableRow
      ref={setNodeRef}
      // dnd-kit computes both every frame of a drag; no class can carry them.
      // oxlint-disable-next-line shadcn/no-inline-styles
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // The row in hand borrows the selected fill, so it reads as lifted above the rows it passes.
      data-state={isDragging ? 'selected' : undefined}
      className={cn(!disabled && 'cursor-grab', isDragging && 'relative z-10 cursor-grabbing')}
      {...listeners}
    >
      <TableCell card='lead'>
        {/* The keyboard's way in: Space picks the row up, the arrows move it. It is never
              natively disabled while a move saves: that would drop the focus it holds after a
              keyboard drop. */}
        {readOnly ? null : (
          <button
            ref={setActivatorNodeRef}
            type='button'
            data-grip
            aria-label={`Move ${priority.name}`}
            className='flex cursor-grab items-center rounded-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-default aria-disabled:opacity-50 pointer-coarse:-m-3 pointer-coarse:p-3'
            {...attributes}
          >
            <GripVertical className='size-3.5' />
          </button>
        )}
      </TableCell>
      <TableCell label='Hierarchy'>
        <span className='font-mono'>{rank}</span>
      </TableCell>
      <TableCell label='Colour'>
        <span className='inline-flex items-center gap-2'>
          <span
            aria-hidden
            className={cn(
              'size-3 shrink-0 rounded-sm',
              priority.color ? 'bg-(--swatch)' : 'bg-muted'
            )}
            style={priority.color ? ({ '--swatch': priority.color } as CSSProperties) : undefined}
          />
          <span className='font-mono text-xs text-muted-foreground'>{priority.color ?? '—'}</span>
        </span>
      </TableCell>
      <TableCell card='title'>
        <span className='font-medium'>{priority.name}</span>
        {/* Older priorities predate departments and rank on every board; dragging one moves it there too. */}
        {priority.department === null ? (
          <span className='ml-2 text-xs text-muted-foreground'>Every department</span>
        ) : null}
      </TableCell>
      <TableCell card='trail'>
        {readOnly ? null : <PriorityActions priority={priority} departmentId={departmentId} />}
      </TableCell>
    </TableRow>
  )
}

export const PrioritiesTable = ({
  priorities,
  departmentId,
  isPending,
  canChange
}: PrioritiesTableProps) => {
  const sensors = useDragSensors({ mouse: RowMouseSensor, touch: RowTouchSensor })
  const save = useReorderPriorities()

  // The order a drop left, held here until the save settles. The cache takes the same order at
  // once, but React Query hands it to the component a tick later, and in that tick dnd-kit has
  // already let go of the rows: they would flash back to where they started before moving.
  const [dropped, setDropped] = useState<Priority[] | null>(null)
  const rows = dropped ?? priorities

  // Each hierarchy counts from 1 on its own: a department's priorities, and those for every department.
  const counted = new Map<number | null, number>()
  const ranks = new Map(
    rows.map(priority => {
      const rank = (counted.get(priority.department) ?? 0) + 1
      counted.set(priority.department, rank)
      return [priority.id, rank]
    })
  )

  const announcements = dragAnnouncements({
    name: (id: UniqueIdentifier) => rows.find(priority => priority.id === id)?.name,
    place: (id: UniqueIdentifier) =>
      `${rows.findIndex(priority => priority.id === id) + 1} of ${rows.length}`,
    area: 'the list'
  })

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return
    const moved = reorder(rows, Number(active.id), Number(over.id))
    if (!moved) return
    setDropped(moved.rows)
    save.mutate(
      { department: moved.department, ids: moved.ids },
      {
        // By now the cache holds the saved order, or the old one again if the save failed.
        onSettled: () => setDropped(null)
      }
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        accessibility={{ announcements }}
        onDragEnd={handleDragEnd}
      >
        <Table data-cards className='min-w-3xl table-fixed'>
          <colgroup>
            <col className='w-10' />
            <col className='w-24' />
            <col className='w-40' />
            <col />
            <col className='w-24' />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className='sr-only'>Move</span>
              </TableHead>
              <TableHead>Hierarchy</TableHead>
              <TableHead>Colour</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>
                {/* The column is obvious from its buttons; the label is for screen readers. */}
                <span className='sr-only'>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableSkeletonRows columns={4} />
            ) : (
              <SortableContext
                items={rows.map(priority => priority.id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map(priority => {
                  const changeable = canChange(priority)
                  return (
                    // A second drag while the first saves would renumber from a list about to change.
                    <SortableRow
                      key={priority.id}
                      priority={priority}
                      rank={ranks.get(priority.id) ?? 0}
                      departmentId={departmentId}
                      disabled={!changeable || save.isPending}
                      readOnly={!changeable}
                    />
                  )
                })}
              </SortableContext>
            )}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  )
}
