import { formatDate } from '@/lib/days'
import { useColumnCells } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from 'cn'
import { Calendar, ChevronRight, Package, SendHorizontal, Split, TriangleAlert } from 'lucide-react'
import { Fragment } from 'react'
import { departmentStateOf, isStockOrder, type TrimLineItem, type TrimOrder } from '../api'
import { useBoard } from '../lib/board-context'
import { tablesFor } from '../lib/columns'
import { partLines, partState, splitOf, toMake } from '../lib/parts'
import { orderStatus } from '../lib/status'
import { NoteButton, type NoteState } from './note-button'
import { PriorityCell } from './priority-cell'
import { ReviewedToggle } from './reviewed-toggle'
import { ScheduledLineItems } from './scheduled-line-items'
import { StatusPill } from './status-pill'

type ScheduledRowProps = {
  order: TrimOrder
  /** The production day this row stands for: a split order is one row per day it has work on. */
  day: string
  departmentId: number | undefined
  expanded: boolean
  selected: boolean
  /** The type exclusion has locked this row: the batch is already the other kind of order. */
  locked: boolean
  overdue: boolean
  noteState: NoteState
  onToggleExpanded: () => void
  onToggleSelected: () => void
  onReschedule: () => void
  onOpenOrderNotes: () => void
  onOpenLineNotes: (item: TrimLineItem, readOnly: boolean) => void
}

const SPLIT_LABEL = {
  partial: 'Partially scheduled — some line items are still on the Unscheduled tab',
  split: 'Split across production days — see the lock icons for lines on another day'
} as const

/**
 * The release checkbox appears only once the order is Reviewed. Before that it is a dash with the
 * reason, and after release it is the icon saying the order has already gone.
 */
const SelectCell = ({
  released,
  reviewed,
  selected,
  locked,
  invoice,
  onToggle
}: {
  released: boolean
  reviewed: boolean
  selected: boolean
  locked: boolean
  invoice: string
  onToggle: () => void
}) => {
  if (released)
    return <SendHorizontal className='size-4 text-primary' aria-label='Released to production' />
  if (!reviewed)
    return (
      <span className='text-muted-foreground' title='Mark Reviewed to select'>
        —
      </span>
    )

  return (
    <Checkbox
      aria-label={`Select order ${invoice} for release`}
      checked={selected}
      disabled={locked}
      title={locked ? 'A release is either stock orders or customer orders, not both' : undefined}
      onCheckedChange={onToggle}
    />
  )
}

/**
 * Late is a property of the day the order sits on, so it is marked here rather than by reddening the
 * whole row. The day is fixed once the order is out on the floor; before that it can still move.
 */
const ProductionDateCell = ({
  day,
  overdue,
  stock,
  fixed,
  dayWord,
  onReschedule
}: {
  day: string
  overdue: boolean
  stock: boolean
  fixed: boolean
  dayWord: string
  onReschedule: () => void
}) => (
  // The marks follow the date so every row's date starts at the same edge, and never shrink: the cell
  // runs out of room before they do.
  <span className='flex items-center gap-1.5'>
    {fixed ? (
      <span className={cn(overdue ? 'text-destructive' : 'text-muted-foreground')}>
        {formatDate(day)}
      </span>
    ) : (
      <Button variant='outline' title={`Change ${dayWord} (pre-release)`} onClick={onReschedule}>
        <Calendar data-icon='inline-start' />
        {formatDate(day)}
      </Button>
    )}
    {/* A stock order is marked where its production date is — the one column every row shares. */}
    {stock ? (
      <Package className='size-3.5 shrink-0 text-muted-foreground' aria-label='Stock order' />
    ) : null}
    {overdue ? (
      <TriangleAlert className='size-3.5 shrink-0 text-destructive' aria-label='Past due' />
    ) : null}
  </span>
)

export const ScheduledRow = ({
  order,
  day,
  departmentId,
  expanded,
  selected,
  locked,
  overdue,
  noteState,
  onToggleExpanded,
  onToggleSelected,
  onReschedule,
  onOpenOrderNotes,
  onOpenLineNotes
}: ScheduledRowProps) => {
  const state = departmentStateOf(order, departmentId)
  // Each day of a split order is reviewed and released on its own p1 (316,381), (335,505).
  const { reviewed, released } = partState(order, day, departmentId)
  const stock = isStockOrder(order)
  const split = splitOf(order)
  const stopRowClick = (event: { stopPropagation: () => void }) => event.stopPropagation()
  const board = useBoard()
  const { cells } = useColumnCells(tablesFor(board).scheduled)

  // Gate 1: every line of this part that still has to be made carries a machine.
  const machinesAssigned = partLines(order, day).every(
    item => toMake(item) <= 0 || !!item.item?.flow
  )

  return (
    <Fragment>
      <TableRow
        className='cursor-pointer'
        data-overdue={overdue ? true : undefined}
        data-state={selected ? 'selected' : undefined}
        onClick={onToggleExpanded}
      >
        <TableCell onClick={stopRowClick}>
          {/* Only a department that makes what it packs reviews and releases it p3 (1103,281). */}
          {board.makes ? (
            <SelectCell
              released={released}
              reviewed={reviewed}
              selected={selected}
              locked={locked}
              invoice={order.invoice}
              onToggle={onToggleSelected}
            />
          ) : null}
        </TableCell>
        <TableCell onClick={stopRowClick}>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='Toggle details'
            aria-expanded={expanded}
            onClick={onToggleExpanded}
          >
            <ChevronRight
              className={cn('text-muted-foreground transition-transform', expanded && 'rotate-90')}
            />
          </Button>
        </TableCell>

        {cells({
          ship: (
            <TableCell>
              <span className='text-muted-foreground'>{formatDate(order.ship_date)}</span>
            </TableCell>
          ),
          proddate: (
            <TableCell onClick={stopRowClick}>
              <ProductionDateCell
                day={day}
                overdue={overdue}
                stock={stock}
                fixed={released}
                dayWord={board.dayWord}
                onReschedule={onReschedule}
              />
            </TableCell>
          ),
          order: (
            <TableCell>
              <span className='font-mono font-medium' title={order.invoice}>
                {order.invoice}
              </span>
              {split ? (
                <span title={SPLIT_LABEL[split]}>
                  <Split
                    className='ml-1.5 inline size-3.5 text-primary'
                    aria-label={SPLIT_LABEL[split]}
                  />
                </span>
              ) : null}
            </TableCell>
          ),
          customer: (
            <TableCell>
              <span className='truncate'>{stock ? 'Stock' : (order.customer ?? '—')}</span>
            </TableCell>
          ),
          priority: (
            <TableCell onClick={stopRowClick}>
              <PriorityCell order={order} departmentId={departmentId} />
            </TableCell>
          ),
          reviewed: (
            <TableCell onClick={stopRowClick}>
              {/* A bypassed order never goes through review — its status is what says so. */}
              {state?.status === 'bypassed' ? (
                <span className='text-muted-foreground'>N/A</span>
              ) : (
                <ReviewedToggle
                  order={order}
                  day={day}
                  departmentId={departmentId}
                  reviewed={reviewed}
                  released={released}
                  machinesAssigned={machinesAssigned}
                />
              )}
            </TableCell>
          ),
          status: (
            <TableCell>
              {/* Until an order is released it has no status, which the board leaves empty — but an
                  accessory is Not Started the moment it is scheduled p3 (1103,281). */}
              <StatusPill
                status={released || !board.makes ? orderStatus(state?.status ?? null) : null}
              />
            </TableCell>
          ),
          shipvia: (
            <TableCell>
              <span className='truncate text-muted-foreground'>{order.ship_via ?? '—'}</span>
            </TableCell>
          ),
          trimloc: (
            <TableCell>
              {/* A stock order is what puts trims on the shelf, so it has no location of its own. */}
              <span className='font-mono text-muted-foreground'>
                {stock ? 'N/A' : order.locations.length ? order.locations.join(', ') : '—'}
              </span>
            </TableCell>
          ),
          notes: (
            <TableCell onClick={stopRowClick}>
              {stock ? (
                <span className='text-muted-foreground'>—</span>
              ) : (
                <NoteButton state={noteState} label='Order notes' onClick={onOpenOrderNotes} />
              )}
            </TableCell>
          )
        })}
      </TableRow>

      {expanded ? (
        <TableRow>
          <TableCell colSpan={11}>
            <ScheduledLineItems
              order={order}
              departmentId={departmentId}
              day={day}
              released={released}
              bypassed={state?.status === 'bypassed'}
              onReschedule={onReschedule}
              onOpenNotes={onOpenLineNotes}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  )
}
