import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from 'cn'
import { ChevronRight, Split } from 'lucide-react'
import { Fragment } from 'react'
import { isStockOrder, type TrimLineItem, type TrimOrder } from '../api'
import { formatDate } from '../lib/format'
import { LineItems } from './line-items'
import { NoteButton, type NoteState } from './note-button'
import { PriorityCell } from './priority-cell'

type OrderRowProps = {
  order: TrimOrder
  departmentId: number | undefined
  readOnly: boolean
  expanded: boolean
  selected: boolean
  /** The line items picked off this order for a split; empty unless this is the order being split. */
  splitLineIds: string[]
  noteState: NoteState
  onToggleExpanded: () => void
  onToggleSelected: () => void
  onToggleLine: (lineId: string) => void
  onSplit: () => void
  onOpenOrderNotes: () => void
  onOpenLineNotes: (item: TrimLineItem) => void
}

/**
 * Part of the order sits on a production day and part does not, which is the board's split order. Both
 * halves carry the mark, so a Manager reading either one knows the rest is elsewhere.
 */
const isSplit = (order: TrimOrder) => {
  const scheduled = order.origin_items.filter(
    item => item.production_date ?? item.item?.production_date
  ).length
  return scheduled > 0 && scheduled < order.origin_items.length
}

export const OrderRow = ({
  order,
  departmentId,
  readOnly,
  expanded,
  selected,
  splitLineIds,
  noteState,
  onToggleExpanded,
  onToggleSelected,
  onToggleLine,
  onSplit,
  onOpenOrderNotes,
  onOpenLineNotes
}: OrderRowProps) => {
  const stock = isStockOrder(order)
  const stopRowClick = (event: { stopPropagation: () => void }) => event.stopPropagation()

  return (
    <Fragment>
      <TableRow
        className='cursor-pointer'
        data-state={selected ? 'selected' : undefined}
        onClick={onToggleExpanded}
      >
        <TableCell onClick={stopRowClick}>
          <Checkbox
            aria-label={`Select order ${order.invoice}`}
            checked={selected}
            // Picking line items for a split and ticking the whole order are mutually exclusive.
            disabled={readOnly || splitLineIds.length > 0}
            onCheckedChange={onToggleSelected}
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
          <span className='text-muted-foreground'>{formatDate(order.crea_date)}</span>
        </TableCell>
        <TableCell>
          <span className='text-muted-foreground'>{formatDate(order.ship_date)}</span>
        </TableCell>
        <TableCell>
          <span className='font-mono font-medium' title={order.invoice}>
            {order.invoice}
          </span>
          {isSplit(order) ? (
            <Split
              className='ml-1.5 inline size-3.5 text-primary'
              aria-label='Partially scheduled — some line items are on the Scheduled tab'
            />
          ) : null}
          {stock ? (
            <Badge variant='muted' className='ml-1.5'>
              Stock
            </Badge>
          ) : null}
        </TableCell>
        <TableCell onClick={stopRowClick}>
          <PriorityCell order={order} departmentId={departmentId} readOnly={readOnly} />
        </TableCell>
        <TableCell>
          <span className='truncate'>{order.customer ?? '—'}</span>
        </TableCell>
        <TableCell onClick={stopRowClick}>
          {/* A stock order has no EBMS row, so there is no salesman's note to import. */}
          {stock ? (
            <span className='text-muted-foreground'>—</span>
          ) : (
            <NoteButton state={noteState} label='Order notes' onClick={onOpenOrderNotes} />
          )}
        </TableCell>
      </TableRow>

      {expanded ? (
        <TableRow>
          <TableCell colSpan={8}>
            <LineItems
              order={order}
              ready={departmentId !== undefined}
              selectedLineIds={splitLineIds}
              orderSelected={selected || readOnly}
              onToggleLine={onToggleLine}
              onSplit={onSplit}
              onOpenNotes={onOpenLineNotes}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  )
}
