import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from 'cn'
import { Calendar, ChevronRight, SendHorizontal, Split, TriangleAlert } from 'lucide-react'
import { Fragment } from 'react'
import { departmentStateOf, isStockOrder, type TrimLineItem, type TrimOrder } from '../api'
import { formatDate } from '../lib/format'
import { orderStatus } from '../lib/status'
import { NoteButton, type NoteState } from './note-button'
import { PriorityCell } from './priority-cell'
import { ReviewedToggle } from './reviewed-toggle'
import { ScheduledLineItems } from './scheduled-line-items'
import { StatusPill } from './status-pill'

type ScheduledRowProps = {
  order: TrimOrder
  departmentId: number | undefined
  readOnly: boolean
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
  onOpenLineNotes: (item: TrimLineItem) => void
}

/** Some of the order's line items sit on another production day, or on none. */
const isSplit = (order: TrimOrder, day: string | null) =>
  !!day &&
  order.origin_items.some(item => (item.item?.production_date ?? item.production_date) !== day)

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
    return (
      <SendHorizontal
        className='size-4 text-muted-foreground'
        aria-label='Released to production'
      />
    )
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
  fixed,
  onReschedule
}: {
  day: string | null
  overdue: boolean
  fixed: boolean
  onReschedule: () => void
}) => (
  <span className='flex items-center gap-1'>
    {overdue ? <TriangleAlert className='size-3.5 text-destructive' aria-label='Past due' /> : null}
    {fixed ? (
      <span className={cn(overdue ? 'text-destructive' : 'text-muted-foreground')}>
        {formatDate(day)}
      </span>
    ) : (
      <Button variant='ghost' size='sm' onClick={onReschedule}>
        <Calendar data-icon='inline-start' />
        {formatDate(day)}
      </Button>
    )}
  </span>
)

export const ScheduledRow = ({
  order,
  departmentId,
  readOnly,
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
  const released = state?.release_to_production ?? false
  const reviewed = state?.reviewed ?? false
  const day = state?.production_date ?? null
  const stock = isStockOrder(order)
  const stopRowClick = (event: { stopPropagation: () => void }) => event.stopPropagation()

  // Gate 1: every line that still has to be made carries a machine.
  const machinesAssigned = order.origin_items.every(
    item => item.quantity - (item.item?.pull_from_stock ?? 0) <= 0 || !!item.item?.flow
  )

  return (
    <Fragment>
      <TableRow
        className='cursor-pointer'
        data-state={selected ? 'selected' : undefined}
        onClick={onToggleExpanded}
      >
        <TableCell onClick={stopRowClick}>
          <SelectCell
            released={released}
            reviewed={reviewed}
            selected={selected}
            locked={locked || readOnly}
            invoice={order.invoice}
            onToggle={onToggleSelected}
          />
        </TableCell>
        <TableCell>
          <ChevronRight
            aria-hidden
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              expanded && 'rotate-90'
            )}
          />
        </TableCell>

        <TableCell>
          <span className='text-muted-foreground'>{formatDate(order.ship_date)}</span>
        </TableCell>

        <TableCell onClick={stopRowClick}>
          <ProductionDateCell
            day={day}
            overdue={overdue}
            fixed={released || readOnly}
            onReschedule={onReschedule}
          />
        </TableCell>

        <TableCell>
          <span className='font-mono font-medium'>{order.invoice}</span>
          {isSplit(order, day) ? (
            <Split
              className='ml-1.5 inline size-3.5 text-primary'
              aria-label='Split across production days — the locked lines belong to another day'
            />
          ) : null}
          {stock ? (
            <Badge variant='muted' className='ml-1.5'>
              Stock
            </Badge>
          ) : null}
        </TableCell>

        <TableCell>
          <span className='truncate'>{stock ? 'Stock' : (order.customer ?? '—')}</span>
        </TableCell>

        <TableCell onClick={stopRowClick}>
          <PriorityCell order={order} departmentId={departmentId} readOnly={readOnly} />
        </TableCell>

        <TableCell onClick={stopRowClick}>
          {/* A bypassed order never goes through review — its status is what says so. */}
          {state?.status === 'bypassed' ? (
            <span className='text-muted-foreground'>N/A</span>
          ) : (
            <ReviewedToggle
              order={order}
              departmentId={departmentId}
              reviewed={reviewed}
              released={released}
              machinesAssigned={machinesAssigned}
              readOnly={readOnly}
            />
          )}
        </TableCell>

        <TableCell>
          {/* Until an order is released it has no status, which the board leaves empty. */}
          <StatusPill status={released ? orderStatus(state?.status ?? null) : null} />
        </TableCell>

        <TableCell onClick={stopRowClick}>
          {stock ? (
            <span className='text-muted-foreground'>—</span>
          ) : (
            <NoteButton state={noteState} label='Order notes' onClick={onOpenOrderNotes} />
          )}
        </TableCell>
      </TableRow>

      {expanded ? (
        <TableRow>
          <TableCell colSpan={10}>
            <ScheduledLineItems
              order={order}
              departmentId={departmentId}
              day={day ?? ''}
              released={released}
              readOnly={readOnly}
              onReschedule={onReschedule}
              onOpenNotes={onOpenLineNotes}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  )
}
