import { QueryError } from '@/components/query-error'
import { dragAnnouncements, useDragSensors } from '@/components/table/drag'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { byDay, formatLongDate, today } from '@/lib/days'
import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { GripVertical, Layers, Scissors } from 'lucide-react'
import { Fragment, useState } from 'react'
import {
  prioritiesQuery,
  queueQuery,
  useReorderQueue,
  useSetCurrentCoil,
  type Priority,
  type QueueRow
} from '../api'
import { unitRuns } from '../lib/unit-coils'
import { useViewOnly } from '../lib/board-context'
import { formatCount } from '../lib/format'
import { CoilLock } from './coil-lock'
import { PriorityPill } from '@/components/priority-pill'

const COLUMNS = 11

type QueueTabProps = {
  departmentId: number | undefined
  machineId: number | undefined
  /** The Worker sees the same rows p2 (935,297), but only the Manager moves them p2 (530,641). */
  worker: boolean
}

type QueueLineProps = {
  row: QueueRow
  priority: Priority | null
  movable: boolean
  /** Ticks the row's coil into the machine, or takes it out p2 (902,356). */
  onInMachine: ((row: QueueRow, inMachine: boolean) => void) | null
}

/** Only a coil that is named can go in the machine p2 (895,300); the Slit Line's is not yet. */
const hasCoil = (row: QueueRow) =>
  !!row.supplier && !!row.coil_number && row.coil_icon !== 'waiting_to_slit'

const Locked = ({ value, locked }: { value: string | null; locked: boolean }) => (
  <span className='inline-flex items-center gap-1.5'>
    <span className='truncate font-mono'>{value ?? 'Undefined'}</span>
    <CoilLock locked={locked} />
  </span>
)

// The same coil can head several rows of a day; its coil number and orders tell them apart.
const rowName = (row: QueueRow) =>
  `${row.material_id ?? 'material'} · ${row.coil_number ?? 'Undefined'} · ${
    [...new Set(row.lines.map(line => line.order_number).filter(Boolean))].join(', ') || 'no order'
  }`

const QueueLine = ({ row, priority, movable, onInMachine }: QueueLineProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: row.key, disabled: !movable })

  return (
    <TableRow
      ref={setNodeRef}
      // dnd-kit computes both every frame of a drag; no class can carry them.
      // oxlint-disable-next-line shadcn/no-inline-styles
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-state={isDragging ? 'selected' : undefined}
      data-overdue={row.is_overdue || undefined}
      className={cn(movable && 'cursor-grab', isDragging && 'relative z-10 cursor-grabbing')}
      {...listeners}
    >
      <TableCell>
        {movable ? (
          <button
            ref={setActivatorNodeRef}
            type='button'
            aria-label={`Move ${rowName(row)}`}
            className='flex cursor-grab items-center rounded-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
            {...attributes}
          >
            <GripVertical className='size-3.5' />
          </button>
        ) : null}
      </TableCell>
      <TableCell>
        <span className='font-mono font-medium'>{row.material_id ?? '—'}</span>
      </TableCell>
      <TableCell>{row.profile ?? '—'}</TableCell>
      <TableCell>
        <span className='font-mono'>{formatCount(row.linear_feet)}</span>
      </TableCell>
      <TableCell>
        <span className='font-mono'>{formatCount(row.weight)}</span>
      </TableCell>
      <TableCell>
        {/* Shown, not sorted by: the Manager's order is the order p2 (935,297), (498,662). */}
        {priority ? (
          <PriorityPill priority={priority} />
        ) : (
          <span className='text-muted-foreground'>—</span>
        )}
      </TableCell>
      <TableCell>
        <Locked value={row.supplier} locked={row.coil_fields_locked} />
      </TableCell>
      <TableCell>
        <Locked value={row.coil_number} locked={row.coil_fields_locked} />
      </TableCell>
      <TableCell>
        {row.coil_icon === 'waiting_to_slit' ? (
          <Scissors className='size-3.5 text-warning' aria-label='Waiting for the Slit Line' />
        ) : row.coil_icon === 'slit' ? (
          <Scissors className='size-3.5 text-success' aria-label='Slit' />
        ) : null}
      </TableCell>
      <TableCell>
        <Checkbox
          aria-label={`${rowName(row)} is in the machine`}
          title={hasCoil(row) ? undefined : 'Needs a Supplier and Coil Number first'}
          checked={row.current}
          disabled={!onInMachine || !hasCoil(row)}
          // The row drags from anywhere, by pointer or by Space; on the box either is a toggle.
          onPointerDown={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
          onCheckedChange={checked => onInMachine?.(row, checked)}
        />
      </TableCell>
      <TableCell>
        <span className='truncate text-xs text-muted-foreground'>
          {/* A line split by coil is on this row for some of its units p2 (679,416). */}
          {[
            ...new Set(
              row.lines
                .filter(line => line.order_number)
                .map(line =>
                  line.units
                    ? `${line.order_number} (units ${unitRuns(line.units)})`
                    : line.order_number
                )
            )
          ].join(', ')}
        </span>
      </TableCell>
    </TableRow>
  )
}

/**
 * A machine's Queue p2 (493,630): what is left to roll, a row per run of material, the days apart
 * p2 (499,635). The Manager drags a row within its day p2 (530,641); its day it keeps.
 */
export const QueueTab = ({ departmentId, machineId, worker }: QueueTabProps) => {
  const { data, isPending, isError, error, refetch } = useQuery(queueQuery(departmentId, machineId))
  const { data: priorities } = useQuery(prioritiesQuery(departmentId))
  const priorityOf = new Map(priorities?.map(entry => [entry.id, entry]))
  const viewOnly = useViewOnly()
  const reorder = useReorderQueue()
  const inMachine = useSetCurrentCoil()
  const sensors = useDragSensors()
  // The order a drop left, until the save settles — see the priorities table.
  const [dropped, setDropped] = useState<QueueRow[] | null>(null)
  const rows = dropped ?? data ?? []
  const days = byDay(rows, row => row.production_date)
  const movable = !worker && !viewOnly && !reorder.isPending

  const announcements = dragAnnouncements({
    name: id => {
      const row = rows.find(found => found.key === id)
      return row && rowName(row)
    },
    place: id => {
      const row = rows.find(found => found.key === id)
      const day = rows.filter(found => found.production_date === row?.production_date)
      return `${day.findIndex(found => found.key === id) + 1} of ${day.length}`
    },
    noun: 'material',
    area: 'its day'
  })

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const from = rows.find(row => row.key === active.id)
    const to = rows.find(row => row.key === over?.id)
    if (!from || !to || from === to || departmentId === undefined || machineId === undefined) return
    // A row moves within its day only p2 (530,641).
    if (from.production_date !== to.production_date || !from.production_date) return
    const day = rows.filter(row => row.production_date === from.production_date)
    const moved = arrayMove(day, day.indexOf(from), day.indexOf(to))
    const next = rows.flatMap(row =>
      row.production_date === from.production_date ? (row === day[0] ? moved : []) : [row]
    )
    setDropped(next)
    reorder.mutate(
      {
        departmentId,
        flowId: machineId,
        productionDate: from.production_date,
        keys: moved.map(row => row.key)
      },
      { onSettled: () => setDropped(null) }
    )
  }

  if (isError && !data)
    return (
      <QueryError title='The Queue did not load' error={error} onRetry={() => void refetch()} />
    )

  if (!isPending && !rows.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Layers />
          </EmptyMedia>
          <EmptyTitle>Nothing in the Queue</EmptyTitle>
          <EmptyDescription>
            Material shows here once its orders are released to production.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        accessibility={{ announcements }}
        onDragEnd={handleDragEnd}
      >
        <Table className='min-w-320 table-fixed'>
          <colgroup>
            <col className='w-10' />
            <col className='w-48' />
            <col className='w-40' />
            <col className='w-24' />
            <col className='w-24' />
            <col className='w-28' />
            <col className='w-36' />
            <col className='w-36' />
            <col className='w-20' />
            <col className='w-24' />
            <col />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Material</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>L/F</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Coil Number</TableHead>
              <TableHead>Slit Line</TableHead>
              <TableHead>In Machine</TableHead>
              <TableHead>Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableSkeletonRows columns={COLUMNS} />
            ) : (
              days.map(day => (
                <Fragment key={day.date ?? 'undated'}>
                  <TableRow data-divider>
                    <TableCell colSpan={COLUMNS}>
                      <span className='text-xs font-semibold tracking-wider uppercase'>
                        {day.date ? formatLongDate(day.date) : '—'}
                        {day.date === today() ? ' · today' : ''}
                      </span>
                    </TableCell>
                  </TableRow>
                  <SortableContext
                    items={day.items.map(row => row.key)}
                    strategy={verticalListSortingStrategy}
                  >
                    {day.items.map(row => (
                      <QueueLine
                        key={row.key}
                        row={row}
                        priority={(row.priority && priorityOf.get(row.priority.id)) ?? null}
                        movable={movable}
                        onInMachine={
                          viewOnly || departmentId === undefined || machineId === undefined
                            ? null
                            : (picked, checked) =>
                                inMachine.mutate({
                                  departmentId,
                                  flowId: machineId,
                                  key: checked ? picked.key : null
                                })
                        }
                      />
                    ))}
                  </SortableContext>
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  )
}
