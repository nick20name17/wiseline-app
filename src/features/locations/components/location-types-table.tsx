import { useColumnCells, useColumnOrder, type ColumnTable } from '@/components/table/column-order'
import {
  dragAnnouncements,
  RowMouseSensor,
  RowTouchSensor,
  useDragSensors
} from '@/components/table/drag'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { closestCenter, DndContext, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { GripVertical } from 'lucide-react'
import { useState } from 'react'
import {
  allLocationTypesQuery,
  useReorderLocationTypes,
  warehousePickerQuery,
  type LocationType
} from '../api'
import { LocationTypeActions } from './location-actions'

// The grip and the buttons are not listed: rows are dragged by the first and the last holds the
// actions, so both stay put. The tab says what the types hold, so no column does.
const COLUMNS: ColumnTable = {
  table: 'location-types',
  columns: [
    { key: 'name', label: 'Name', width: 'w-48', align: 'start', card: 'title' },
    { key: 'warehouse', label: 'Warehouse', width: 'w-40' },
    { key: 'description', label: 'Description', align: 'start', card: 'full' }
  ]
}

const byPosition = (a: LocationType, b: LocationType) =>
  (a.position ?? Infinity) - (b.position ?? Infinity) || a.id - b.id

type SortableRowProps = { type: LocationType; warehouse: string | undefined; disabled: boolean }

const SortableRow = ({ type, warehouse, disabled }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: type.id, disabled })
  const columns = useColumnCells(COLUMNS)

  return (
    <TableRow
      ref={setNodeRef}
      // dnd-kit computes both every frame of a drag; no class can carry them.
      // oxlint-disable-next-line shadcn/no-inline-styles
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-state={isDragging ? 'selected' : undefined}
      className={cn(!disabled && 'cursor-grab', isDragging && 'relative z-10 cursor-grabbing')}
      {...listeners}
    >
      <TableCell card='lead'>
        {/* The keyboard's way in: Space picks the row up, the arrows move it. */}
        <button
          ref={setActivatorNodeRef}
          type='button'
          data-grip
          aria-label={`Move ${type.name ?? 'location type'}`}
          className='flex cursor-grab items-center rounded-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-default aria-disabled:opacity-50 pointer-coarse:-m-3 pointer-coarse:p-3'
          {...attributes}
        >
          <GripVertical className='size-3.5' />
        </button>
      </TableCell>
      {columns.cells({
        name: <TableCell>{type.name ?? '—'}</TableCell>,
        warehouse: <TableCell>{warehouse ?? '—'}</TableCell>,
        description: (
          <TableCell>
            <span className='truncate text-muted-foreground'>{type.description ?? '—'}</span>
          </TableCell>
        )
      })}
      <TableCell card='trail'>
        <LocationTypeActions locationType={type} />
      </TableCell>
    </TableRow>
  )
}

type LocationTypesTableProps = {
  /** One department's types of one kind, in the server's order: by position. */
  types: LocationType[]
  departmentId: number | undefined
  isPending: boolean
  /** A search lists only some of the types, which leaves no whole order to drag into. */
  searching: boolean
}

/**
 * A department's types of one kind, dragged into the order the Select Location window lists their
 * locations in. The server takes every type of the department at once, so the other kind's keep
 * their places among them.
 */
export const LocationTypesTable = ({
  types,
  departmentId,
  isPending,
  searching
}: LocationTypesTableProps) => {
  const sensors = useDragSensors({ mouse: RowMouseSensor, touch: RowTouchSensor })
  const columns = useColumnOrder(COLUMNS)
  const { data: warehouses } = useQuery(warehousePickerQuery)
  const { data: everyType } = useQuery(allLocationTypesQuery)
  const save = useReorderLocationTypes()

  // The order a drop left, held until the save settles so the rows do not flash back first.
  const [dropped, setDropped] = useState<LocationType[] | null>(null)
  const rows = dropped ?? types

  const announcements = dragAnnouncements({
    name: (id: UniqueIdentifier) => rows.find(type => type.id === id)?.name ?? undefined,
    place: (id: UniqueIdentifier) =>
      `${rows.findIndex(type => type.id === id) + 1} of ${rows.length}`,
    area: 'the list'
  })

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || departmentId === undefined || !everyType) return
    const moved = arrayMove(
      rows,
      rows.findIndex(type => type.id === active.id),
      rows.findIndex(type => type.id === over.id)
    )
    // The department's whole order, with this tab's types taking their own slots in the new order.
    const shown = new Set(moved.map(type => type.id))
    const next = moved[Symbol.iterator]()
    const ids = everyType
      .filter(type => type.department_id === departmentId)
      .toSorted(byPosition)
      .map(type => (shown.has(type.id) ? next.next().value!.id : type.id))
    setDropped(moved)
    save.mutate({ department: departmentId, ids }, { onSettled: () => setDropped(null) })
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
            {columns.cols}
            <col className='w-24' />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className='sr-only'>Move</span>
              </TableHead>
              {columns.headers}
              <TableHead>
                {/* The column is obvious from its buttons; the label is for screen readers. */}
                <span className='sr-only'>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableSkeletonRows actions />
            ) : (
              <SortableContext
                items={rows.map(type => type.id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map(type => (
                  // A second drag while the first saves would renumber from a list about to change.
                  <SortableRow
                    key={type.id}
                    type={type}
                    warehouse={
                      warehouses?.find(warehouse => warehouse.id === type.warehouse_id)?.name ??
                      undefined
                    }
                    disabled={searching || save.isPending || !everyType}
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
