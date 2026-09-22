import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from 'cn'
import { GripVertical } from 'lucide-react'
import { useState, type CSSProperties, type SyntheticEvent } from 'react'
import { useReorderPriorities, type Department, type Priority } from '../api'
import { reorder } from '../lib/reorder'
import { PriorityActions } from './priority-actions'

type PrioritiesTableProps = {
  /** In hierarchy order; under one department the rows are the hierarchy. */
  priorities: Priority[]
  /**
   * Set when every department is listed: each row then names its own, and nothing drags, since a
   * hierarchy only orders the priorities inside one department.
   */
  departments?: Department[]
  isPending: boolean
}

type SortableRowProps = {
  priority: Priority
  sortable: boolean
  /** The department's name, shown when every department is listed. */
  department?: string
  disabled: boolean
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

const SortableRow = ({ priority, sortable, department, disabled }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: priority.id, disabled: disabled || !sortable })

  return (
    <TableRow
      ref={setNodeRef}
      // dnd-kit computes both every frame of a drag; no class can carry them.
      // oxlint-disable-next-line shadcn/no-inline-styles
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // The row in hand borrows the selected fill, so it reads as lifted above the rows it passes.
      data-state={isDragging ? 'selected' : undefined}
      className={cn(
        sortable && !disabled && 'cursor-grab',
        isDragging && 'relative z-10 cursor-grabbing'
      )}
      {...listeners}
    >
      {sortable ? (
        <TableCell>
          {/* The keyboard's way in: Space picks the row up, the arrows move it. It is never
              natively disabled while a move saves: that would drop the focus it holds after a
              keyboard drop. */}
          <button
            ref={setActivatorNodeRef}
            type='button'
            data-grip
            aria-label={`Move ${priority.name}`}
            className='flex cursor-grab items-center rounded-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-default aria-disabled:opacity-50'
            {...attributes}
          >
            <GripVertical className='size-3.5' />
          </button>
        </TableCell>
      ) : null}
      <TableCell>
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
      <TableCell>
        <span className='font-medium'>{priority.name}</span>
      </TableCell>
      {sortable ? null : <TableCell>{department}</TableCell>}
      <TableCell>
        <PriorityActions priority={priority} />
      </TableCell>
    </TableRow>
  )
}

export const PrioritiesTable = ({ priorities, departments, isPending }: PrioritiesTableProps) => {
  const sortable = !departments
  const sensors = useSensors(
    useSensor(RowMouseSensor, { activationConstraint: { distance: 4 } }),
    // A finger holds before it drags, so a swipe over the rows still scrolls the page.
    useSensor(RowTouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const save = useReorderPriorities()

  // The order a drop left, held here until the save settles. The cache takes the same order at
  // once, but React Query hands it to the component a tick later, and in that tick dnd-kit has
  // already let go of the rows: they would flash back to where they started before moving.
  const [dropped, setDropped] = useState<Priority[] | null>(null)
  const rows = dropped ?? priorities

  const departmentOf = (priority: Priority) =>
    departments?.find(department => department.id === priority.department)?.name ??
    'Every department'

  const name = (id: UniqueIdentifier) => rows.find(priority => priority.id === id)?.name
  const place = (id: UniqueIdentifier) =>
    `${rows.findIndex(priority => priority.id === id) + 1} of ${rows.length}`

  // The defaults read out ids; a screen reader user needs the priority's name and its place.
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}, at ${place(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${name(active.id)} moved to ${place(over.id)}.`
        : `${name(active.id)} is off the list.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${name(active.id)} dropped at ${place(over.id)}.`
        : `${name(active.id)} dropped back where it was.`,
    onDragCancel: ({ active }) => `Move cancelled; ${name(active.id)} is back where it was.`
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return
    const { rows: next, moved } = reorder(rows, Number(active.id), Number(over.id))
    if (!moved.length) return
    setDropped(next)
    save.mutate(moved, {
      onError: error =>
        toast.add({ type: 'error', title: 'The order was not saved', description: error.message }),
      // By now the cache holds the saved order, or the old one again if the save failed.
      onSettled: () => setDropped(null)
    })
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
        <Table className='min-w-3xl table-fixed'>
          <colgroup>
            {sortable ? <col className='w-10' /> : null}
            <col className='w-40' />
            <col />
            {sortable ? null : <col className='w-56' />}
            <col className='w-24' />
          </colgroup>
          <TableHeader>
            <TableRow>
              {sortable ? (
                <TableHead>
                  <span className='sr-only'>Move</span>
                </TableHead>
              ) : null}
              <TableHead>Colour</TableHead>
              <TableHead>Name</TableHead>
              {sortable ? null : <TableHead>Department</TableHead>}
              <TableHead>
                {/* The column is obvious from its buttons; the label is for screen readers. */}
                <span className='sr-only'>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableSkeletonRows columns={3} />
            ) : (
              <SortableContext
                items={rows.map(priority => priority.id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map(priority => (
                  // A second drag while the first saves would renumber from a list about to change.
                  <SortableRow
                    key={priority.id}
                    priority={priority}
                    sortable={sortable}
                    department={departments ? departmentOf(priority) : undefined}
                    disabled={save.isPending}
                  />
                ))}
              </SortableContext>
            )}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  )
}
