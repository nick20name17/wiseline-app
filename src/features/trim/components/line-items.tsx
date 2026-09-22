import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from 'cn'
import { CalendarDays, Lock, Split } from 'lucide-react'
import type { TrimLineItem, TrimOrder } from '../api'
import { formatDate } from '../lib/format'
import { NoteButton } from './note-button'
import { useLineNoteState } from './use-line-note-state'

type LineItemsProps = {
  order: TrimOrder
  selectedLineIds: string[]
  /** The department id is known, so a split has somewhere to go. */
  ready: boolean
  /** True while the whole order is ticked for scheduling: the two selections are mutually exclusive. */
  orderSelected: boolean
  onToggleLine: (originItem: string) => void
  onSplit: () => void
  onOpenNotes: (item: TrimLineItem) => void
}

/** A line already carrying a production date has been scheduled; on this tab it is read-only. */
const isScheduled = (item: TrimLineItem) => !!(item.production_date ?? item.item?.production_date)

export const LineItems = ({
  order,
  selectedLineIds,
  ready,
  orderSelected,
  onToggleLine,
  onSplit,
  onOpenNotes
}: LineItemsProps) => {
  const noteState = useLineNoteState(order.origin_items)
  const picked = new Set(selectedLineIds)

  if (!order.origin_items.length) {
    return (
      <p className='px-3 py-4 text-sm text-muted-foreground'>
        This order has no Trim line items to show.
      </p>
    )
  }

  return (
    <div className='space-y-2 border-l-2 border-primary/40 bg-muted/30 px-3 py-3'>
      <div className='flex items-center gap-3'>
        <span className='flex items-center gap-1.5 text-sm font-medium'>
          <Split className='size-4' />
          Split order
        </span>
        {selectedLineIds.length ? (
          <span className='text-xs text-muted-foreground'>
            <b className='font-semibold text-foreground'>{selectedLineIds.length}</b> line item
            {selectedLineIds.length > 1 ? 's' : ''} picked — schedule them to their own day.
          </span>
        ) : null}
        <Button
          variant='outline'
          size='sm'
          className='ml-auto'
          disabled={!ready || !selectedLineIds.length}
          onClick={onSplit}
        >
          <CalendarDays data-icon='inline-start' />
          Split &amp; schedule{selectedLineIds.length ? ` (${selectedLineIds.length})` : ''}
        </Button>
      </div>

      <div className='overflow-hidden rounded-lg border border-border bg-card'>
        <Table className='table-fixed'>
          <colgroup>
            <col className='w-10' />
            <col className='w-20' />
            <col className='w-32' />
            <col />
            <col className='w-20' />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Qty</TableHead>
              <TableHead>Product ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>
                <span className='sr-only'>Notes</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.origin_items.map(item => {
              const locked = isScheduled(item)

              return (
                // A line already on a day is read-only here; the mute says so before the lock does.
                <TableRow key={item.id}>
                  <TableCell>
                    {locked ? (
                      <Lock
                        className='size-3.5'
                        aria-label={`Scheduled ${formatDate(item.production_date ?? item.item?.production_date ?? null)}`}
                      />
                    ) : (
                      <Checkbox
                        aria-label={`Select line item ${item.id_inven ?? item.id}`}
                        checked={picked.has(item.id)}
                        disabled={orderSelected}
                        onCheckedChange={() => onToggleLine(item.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn('font-mono', locked && 'text-muted-foreground')}>
                      {item.quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('font-mono', locked && 'text-muted-foreground')}>
                      {item.id_inven ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('truncate', locked && 'text-muted-foreground')}>
                      {item.description ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <NoteButton
                      state={noteState(item)}
                      label='Line item notes'
                      onClick={() => onOpenNotes(item)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
