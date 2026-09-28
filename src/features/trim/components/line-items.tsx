import { formatDate } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
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
import { CalendarDays, Lock, Split } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { wholeOrderQuery, type TrimLineItem, type TrimOrder } from '../api'
import { UNSCHEDULED_LINES_TABLE } from '../lib/columns'
import { lineDay } from '../lib/parts'
import { NoteButton } from './note-button'
import { useLineNoteState } from './use-line-note-state'

type LineItemsProps = {
  order: TrimOrder
  selectedLineIds: string[]
  /** The department id is known, so a split has somewhere to go. */
  ready: boolean
  /** An order is ticked for scheduling somewhere on the board: the two selections are exclusive. */
  scheduling: boolean
  onToggleLine: (originItem: string) => void
  onSplit: () => void
  onOpenNotes: (item: TrimLineItem, readOnly: boolean) => void
}

export const LineItems = ({
  order: listed,
  selectedLineIds,
  ready,
  scheduling,
  onToggleLine,
  onSplit,
  onOpenNotes
}: LineItemsProps) => {
  const { data: order = listed } = useQuery(wholeOrderQuery(listed))
  const noteState = useLineNoteState(order.origin_items.map(item => item.id))
  const picked = new Set(selectedLineIds)
  const columns = useColumnOrder(UNSCHEDULED_LINES_TABLE)

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
            {columns.cols}
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead />
              {columns.headers}
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.origin_items.map(item => {
              const day = lineDay(item)
              const locked = !!day

              return (
                // A line already on a day is read-only here; the mute says so before the lock does.
                <TableRow key={item.id} data-locked={locked || undefined}>
                  <TableCell>
                    {locked ? (
                      <Lock className='size-3.5' aria-label={`Scheduled ${formatDate(day)}`} />
                    ) : (
                      <Checkbox
                        aria-label={`Select line item ${item.id_inven ?? item.id}`}
                        checked={picked.has(item.id)}
                        disabled={scheduling}
                        title={
                          scheduling
                            ? 'Orders are ticked to Schedule — clear them first'
                            : undefined
                        }
                        onCheckedChange={() => onToggleLine(item.id)}
                      />
                    )}
                  </TableCell>
                  {columns.cells({
                    qty: (
                      <TableCell>
                        <span className='font-mono'>{item.quantity}</span>
                      </TableCell>
                    ),
                    pid: (
                      <TableCell>
                        <span className='font-mono'>{item.id_inven ?? '—'}</span>
                      </TableCell>
                    ),
                    desc: (
                      <TableCell>
                        <span className='truncate'>{item.description ?? '—'}</span>
                      </TableCell>
                    ),
                    notes: (
                      <TableCell>
                        <NoteButton
                          state={noteState(item.id)}
                          label='Line item notes'
                          onClick={() => onOpenNotes(item, locked)}
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
