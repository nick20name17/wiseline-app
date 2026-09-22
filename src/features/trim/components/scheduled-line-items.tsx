import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Calendar, ChevronDown, Lock } from 'lucide-react'
import { machinesQuery, useUpdateLineItem, type TrimLineItem, type TrimOrder } from '../api'
import { formatDate } from '../lib/format'
import { itemStatus } from '../lib/status'
import { NoteButton } from './note-button'
import { StatusPill } from './status-pill'
import { useLineNoteState } from './use-line-note-state'

// The length every trim is cut to unless somebody says otherwise; anything else is worth a second look.
const STANDARD_LENGTH = 120

type ScheduledLineItemsProps = {
  order: TrimOrder
  departmentId: number | undefined
  /** The production day this row stands for. A line sitting on another day is read-only here. */
  day: string
  released: boolean
  readOnly: boolean
  onReschedule: () => void
  onOpenNotes: (item: TrimLineItem) => void
}

const dayOf = (item: TrimLineItem) => item.item?.production_date ?? item.production_date ?? null

/** What still has to be made: the ordered quantity less whatever is being pulled from stock. */
const toMake = (item: TrimLineItem) => item.quantity - (item.item?.pull_from_stock ?? 0)

/**
 * The line items under an expanded scheduled order: everything a Manager sets while reviewing it, and
 * everything the floor reports back once it is released.
 */
export const ScheduledLineItems = ({
  order,
  departmentId,
  day,
  released,
  readOnly,
  onReschedule,
  onOpenNotes
}: ScheduledLineItemsProps) => {
  const noteState = useLineNoteState(order.origin_items)
  const { data: machines } = useQuery(machinesQuery(departmentId))
  const update = useUpdateLineItem()

  const edit = (item: TrimLineItem, patch: Parameters<typeof update.mutate>[0]['edit']) => {
    const itemId = item.item?.id
    if (itemId) update.mutate({ itemId, edit: patch })
  }

  if (!order.origin_items.length) {
    return (
      <p className='px-3 py-4 text-sm text-muted-foreground'>
        This order has no Trim line items to show.
      </p>
    )
  }

  return (
    <div className='space-y-2 border-l-2 border-primary/40 bg-muted/30 px-3 py-3'>
      {/* Before release the Manager can still move the whole part to another day; after it, the two
          actions the board leaves here are gone and the rows are a record. */}
      {released ? null : (
        <div className='flex items-center gap-3'>
          <span className='text-sm font-medium'>Reviewing order</span>
          <Button
            variant='outline'

            className='ml-auto'
            disabled={readOnly}
            onClick={onReschedule}
          >
            <Calendar data-icon='inline-start' />
            Reschedule
          </Button>
        </div>
      )}

      <div className='overflow-hidden rounded-lg border border-border bg-card'>
        <Table className='min-w-4xl table-fixed'>
          <colgroup>
            <col className='w-10' />
            <col className='w-16' />
            <col className='w-28' />
            <col className='w-32' />
            <col className='w-20' />
            <col className='w-32' />
            <col className='w-32' />
            <col />
            <col className='w-20' />
            <col className='w-16' />
            <col className='w-20' />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Qty</TableHead>
              <TableHead>Vented</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Product ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>W&quot;</TableHead>
              <TableHead>L&quot;</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.origin_items.map(item => {
              const lineDay = dayOf(item)
              // On a day tab, a line belonging to another day — or to none — greys out and is left
              // alone: it is being worked from its own row, on its own day.
              const otherDay = lineDay !== day
              const editable = !released && !otherDay && !readOnly
              const fromStock = item.item?.pull_from_stock ?? 0
              const allFromStock = fromStock >= item.quantity
              const machine = item.item?.flow ?? null
              const width = item.item?.width ?? item.width
              const description = item.item?.description ?? item.description

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {otherDay ? (
                      <Lock
                        className='size-3.5 text-muted-foreground'
                        aria-label={
                          lineDay ? `Scheduled ${formatDate(lineDay)}` : 'Not yet scheduled'
                        }
                      />
                    ) : null}
                  </TableCell>

                  <TableCell>
                    <span className={cn('font-mono', otherDay && 'text-muted-foreground')}>
                      {item.quantity}
                    </span>
                  </TableCell>

                  <TableCell>
                    {/* Nothing left to make means nothing to vent, and a line on another day is
                        answered from its own row — neither is an unticked box. */}
                    {otherDay || toMake(item) <= 0 ? (
                      <span className='text-muted-foreground'>—</span>
                    ) : (
                      <Checkbox
                        aria-label={`Vent ${item.id_inven ?? item.id}`}
                        checked={item.item?.vented ?? false}
                        disabled={!editable || update.isPending}
                        onCheckedChange={checked => edit(item, { vented: checked === true })}
                      />
                    )}
                  </TableCell>

                  <TableCell>
                    {otherDay ? (
                      <span className='text-muted-foreground'>—</span>
                    ) : allFromStock ? (
                      <span className='text-muted-foreground'>Stock</span>
                    ) : editable ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant='outline'

                              className='w-full justify-between'
                              aria-label={`Machine for ${item.id_inven ?? item.id}`}
                            />
                          }
                        >
                          {machine?.name ?? 'Assign'}
                          <ChevronDown data-icon='inline-end' />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='start' className='min-w-40'>
                          <DropdownMenuRadioGroup
                            value={machine ? String(machine.id) : ''}
                            onValueChange={value => edit(item, { flow: Number(value) })}
                          >
                            {machines?.map(option => (
                              <DropdownMenuRadioItem key={option.id} value={String(option.id)}>
                                {option.name ?? `Machine ${option.id}`}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span>{machine?.name ?? '—'}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {/* Match the ordered quantity and the server moves the line to Stock on its own. */}
                    {editable ? (
                      <Input
                        type='number'
                        min={0}
                        max={item.quantity}
                        aria-label={`From stock for ${item.id_inven ?? item.id}`}
                        defaultValue={fromStock}
                        onBlur={event => {
                          const next = Number(event.target.value)
                          if (next !== fromStock) edit(item, { pull_from_stock: next })
                        }}
                      />
                    ) : (
                      <span className='font-mono text-muted-foreground'>{fromStock}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {/* A line says nothing about itself until the order is released, and a dash is
                        that nothing. */}
                    <StatusPill status={released ? itemStatus(item.item?.status ?? null) : null} />
                  </TableCell>

                  <TableCell>
                    <span className={cn('font-mono', otherDay && 'text-muted-foreground')}>
                      {item.id_inven ?? '—'}
                    </span>
                  </TableCell>

                  <TableCell>
                    {editable ? (
                      <Input
                        aria-label={`Description for ${item.id_inven ?? item.id}`}
                        defaultValue={description ?? ''}
                        onBlur={event => {
                          if (event.target.value !== (description ?? ''))
                            edit(item, { description: event.target.value })
                        }}
                      />
                    ) : (
                      <span className={cn('truncate', otherDay && 'text-muted-foreground')}>
                        {description ?? '—'}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {editable ? (
                      <Input
                        type='number'
                        min={0}
                        step={0.1}
                        aria-label={`Width for ${item.id_inven ?? item.id}`}
                        defaultValue={width}
                        onBlur={event => {
                          const next = Number(event.target.value)
                          if (next !== width) edit(item, { width: next })
                        }}
                      />
                    ) : (
                      <span className='font-mono'>{width}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        'font-mono',
                        item.length !== STANDARD_LENGTH && 'text-destructive'
                      )}
                      title={
                        item.length === STANDARD_LENGTH
                          ? undefined
                          : `Non-standard length (not ${STANDARD_LENGTH}")`
                      }
                    >
                      {item.length}
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
