import { formatDate } from '@/lib/days'
import { useColumnCells } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from 'cn'
import { ChevronRight, Split } from 'lucide-react'
import { Fragment } from 'react'
import { isStockOrder, type TrimLineItem, type TrimOrder } from '../api'
import { UNSCHEDULED_TABLE } from '../lib/columns'
import { splitOf } from '../lib/parts'
import { LineItems } from './line-items'
import { NoteButton, type NoteState } from './note-button'
import { PriorityCell } from './priority-cell'

type OrderRowProps = {
  order: TrimOrder
  departmentId: number | undefined
  expanded: boolean
  selected: boolean
  /** The line items picked off this order for a split; empty unless this is the order being split. */
  splitLineIds: string[]
  /** Line items are picked for a split somewhere on the board, which shuts every order's box. */
  splitting: boolean
  /** An order is ticked for scheduling somewhere on the board, which shuts every line's box. */
  scheduling: boolean
  noteState: NoteState
  onToggleExpanded: () => void
  onToggleSelected: () => void
  onToggleLine: (lineId: string) => void
  onSplit: () => void
  onOpenOrderNotes: () => void
  onOpenLineNotes: (item: TrimLineItem, readOnly: boolean) => void
}

export const OrderRow = ({
  order,
  departmentId,
  expanded,
  selected,
  splitLineIds,
  splitting,
  scheduling,
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
  const { cells } = useColumnCells(UNSCHEDULED_TABLE)

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
            // Picking line items for a split and ticking orders are mutually exclusive, board-wide
            // (p1 (286,309), (332,315)).
            disabled={splitting}
            title={splitting ? 'Clear the Split selection first' : undefined}
            onCheckedChange={onToggleSelected}
          />
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
          entry: (
            <TableCell>
              <span className='text-muted-foreground'>{formatDate(order.crea_date)}</span>
            </TableCell>
          ),
          ship: (
            <TableCell>
              <span className='text-muted-foreground'>{formatDate(order.ship_date)}</span>
            </TableCell>
          ),
          order: (
            <TableCell>
              <span className='font-mono font-medium' title={order.invoice}>
                {order.invoice}
              </span>
              {/* Both halves of a partly scheduled order carry the mark, so a Manager reading either
                  one knows the rest is elsewhere. */}
              {splitOf(order) === 'partial' ? (
                <span title='Partially scheduled — some line items are on the Scheduled tab'>
                  <Split
                    className='ml-1.5 inline size-3.5 text-primary'
                    aria-label='Partially scheduled — some line items are on the Scheduled tab'
                  />
                </span>
              ) : null}
            </TableCell>
          ),
          priority: (
            <TableCell onClick={stopRowClick}>
              <PriorityCell order={order} departmentId={departmentId} />
            </TableCell>
          ),
          customer: (
            <TableCell>
              <span className='truncate'>{stock ? 'Stock' : (order.customer ?? '—')}</span>
            </TableCell>
          ),
          notes: (
            <TableCell onClick={stopRowClick}>
              {/* A stock order has no EBMS row, so there is no salesman's note to import. */}
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
          <TableCell colSpan={8}>
            <LineItems
              order={order}
              ready={departmentId !== undefined}
              selectedLineIds={splitLineIds}
              scheduling={scheduling}
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
