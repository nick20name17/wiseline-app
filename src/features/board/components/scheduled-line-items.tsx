import { useBoard } from '../lib/board-context'
import { formatDate } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
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
import { Calendar, ChevronDown, Cylinder, Lock, Scissors } from 'lucide-react'
import { useState } from 'react'
import {
  isStockOrder,
  machinesQuery,
  slitStatesQuery,
  useSlitRequest,
  wholeOrderQuery,
  useUpdateLineItem,
  type LineItemEdit,
  type BoardLineItem,
  type BoardOrder,
  type CoilState
} from '../api'
import { withoutStock } from '../lib/columns'
import { isBender } from '../lib/cutlists'
import { byProduct, lineDay, newProduct, partLines, toMake } from '../lib/parts'
import { itemStatus } from '../lib/status'
import { NoteButton } from './note-button'
import { CoilAssignDialog } from './coil-assign-dialog'
import { StatusPill } from './status-pill'
import { useLineNoteState } from './use-line-note-state'

type ScheduledLineItemsProps = {
  order: BoardOrder
  departmentId: number | undefined
  /** The production day this row stands for. A line sitting on another day is read-only here. */
  day: string
  released: boolean
  /** Bypassed work skips the machines, so there is nothing to vent or assign. */
  bypassed: boolean
  onReschedule: () => void
  onOpenNotes: (item: BoardLineItem, readOnly: boolean) => void
}

/**
 * A number box commits on blur. An empty box is no answer, so it goes back to what was there rather
 * than writing a zero; anything else is held to the range first, and shown as what is being written.
 */
const commitNumber = (
  input: HTMLInputElement,
  /** `null` is a figure EBMS has none of: the box reverts to blank. */
  current: number | null,
  range: { min: number; max?: number },
  write: (next: number, revert: () => void) => void
) => {
  const revert = () => {
    input.value = current === null ? '' : String(current)
  }
  if (input.value.trim() === '' || Number.isNaN(input.valueAsNumber)) return revert()
  const next = Math.min(range.max ?? Infinity, Math.max(range.min, input.valueAsNumber))
  input.value = String(next)
  if (next !== current) write(next, revert)
}

/** A Rollforming line's coil as its cells print it p2 (1051,333), (1086,349). */
const coilOf = (item: BoardLineItem, slit: CoilState | undefined) => ({
  icon: slit?.icon ?? (item.item ? 'coil' : null),
  locked: slit?.locked ?? false,
  supplier: slit?.supplier ?? item.item?.supplier ?? 'Undefined',
  coilNumber: slit?.coil_number ?? item.item?.coil_number ?? 'Undefined'
})

const CoilIcon = ({ icon }: { icon: string | null }) =>
  icon === 'waiting_to_slit' ? (
    <Scissors className='size-3.5 shrink-0 text-warning' aria-label='Waiting for the Slit Line' />
  ) : icon === 'slit' ? (
    <Scissors className='size-3.5 shrink-0 text-success' aria-label='Slit' />
  ) : icon === 'coil' ? (
    <Cylinder className='size-3.5 shrink-0 text-muted-foreground' aria-label='Rolled from a coil' />
  ) : null

/**
 * The line items under an expanded scheduled order: everything a Manager sets while reviewing it, and
 * everything the floor reports back once it is released.
 */
export const ScheduledLineItems = ({
  order: listed,
  departmentId,
  day,
  released,
  bypassed,
  onReschedule,
  onOpenNotes
}: ScheduledLineItemsProps) => {
  const board = useBoard()
  const { data: order = listed } = useQuery(wholeOrderQuery(board.name, listed))
  const noteState = useLineNoteState(order.origin_items.map(item => item.id))
  // Only a board that puts lines on machines by hand needs the machines.
  const { data: machines } = useQuery({
    ...machinesQuery(board.name, departmentId),
    enabled: board.assignsMachines
  })
  // A trim is assigned to the machine that bends it.
  const stations = machines?.filter(isBender)
  const update = useUpdateLineItem()
  const { data: slitStates } = useQuery({
    ...slitStatesQuery(departmentId),
    enabled: board.coils && departmentId !== undefined
  })
  const slit = useSlitRequest()
  // The lines ticked for a coil, all of one Product ID p2 (540,467).
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [assigning, setAssigning] = useState(false)

  // A stock order is what puts trims on the shelf, so it has nothing to take from it.
  const stock = isStockOrder(order)
  // On a day tab, a line belonging to another day — or to none — greys out and is left alone: it is
  // being worked from its own row, on its own day.
  const own = new Set(partLines(order, day).map(item => item.id))
  const lines = board.tables.scheduledLines
  const columns = useColumnOrder(stock ? withoutStock(lines) : lines)

  /** A refused write puts the box back to what the server still holds, not what was typed. */
  const edit = (item: BoardLineItem, patch: LineItemEdit, revert?: () => void) => {
    const itemId = item.item?.id
    if (itemId) update.mutate({ itemId, edit: patch }, { onError: revert })
  }

  const rows = board.coils ? [...order.origin_items].sort(byProduct) : order.origin_items
  const pickedLines = rows.filter(item => picked.has(item.id))
  const pickedProduct = pickedLines[0]?.id_inven ?? null
  const pickedWaiting = pickedLines.filter(
    item => slitStates?.get(item.id)?.icon === 'waiting_to_slit'
  )

  if (!order.origin_items.length) {
    return (
      <p className='px-3 py-4 text-sm text-muted-foreground'>
        This order has no {board.name} line items to show.
      </p>
    )
  }

  return (
    <div className='space-y-2 border-l-2 border-primary/40 bg-muted/30 px-3 py-3'>
      {/* Before release the Manager can still move the whole part to another day; after it, the two
          actions the board leaves here are gone and the rows are a record. */}
      {released ? null : (
        <div className='flex items-center gap-3'>
          <span className='text-sm font-medium'>
            {board.makes ? 'Reviewing order' : 'Scheduled order'}
          </span>
          {/* Gone once released p2 (541,647). */}
          {board.coils ? (
            <>
              <Button
                variant='outline'
                className='ml-auto'
                disabled={!pickedLines.length}
                onClick={() => setAssigning(true)}
              >
                <Cylinder data-icon='inline-start' />
                Select Supplier / Coil Number{pickedLines.length ? ` (${pickedLines.length})` : ''}
              </Button>
              <Button
                variant='outline'
                disabled={!pickedLines.length || slit.isPending}
                onClick={() =>
                  slit.mutate(
                    {
                      originItems: pickedLines.map(item => item.id),
                      // All of them already waiting takes them back; anything else sends them.
                      slit: pickedWaiting.length !== pickedLines.length
                    },
                    { onSuccess: () => setPicked(new Set()) }
                  )
                }
              >
                <Scissors data-icon='inline-start' />
                {pickedLines.length && pickedWaiting.length === pickedLines.length
                  ? 'Take off the Slit Line'
                  : 'Send to the Slit Line'}
              </Button>
            </>
          ) : null}
          <Button
            variant='outline'
            className={cn(!board.coils && 'ml-auto')}
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
            {columns.cols}
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead />
              {columns.headers}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item, index) => {
              const itemDay = lineDay(item)
              const otherDay = !own.has(item.id)
              const editable = !released && !otherDay
              const fromStock = item.item?.pull_from_stock ?? 0
              const allFromStock = item.quantity > 0 && fromStock >= item.quantity
              // A line says nothing about itself until the order is released — except a line pulled
              // whole from stock, which is Stock the moment the figure matches (p1 (292,449)), and an
              // accessory, which is Not Started from the moment it is scheduled p3 (1080,304). A line
              // still waiting for a day has no status p3 (1097,272).
              const status = !board.makes
                ? released || !otherDay
                  ? (item.item?.status ?? 'not_started')
                  : null
                : released
                  ? (item.item?.status ?? null)
                  : allFromStock && !otherDay
                    ? 'stock'
                    : null
              const offLength =
                board.standardLength !== null &&
                item.length !== null &&
                item.length !== board.standardLength
              const coil = coilOf(item, slitStates?.get(item.id))
              const pickable =
                board.coils &&
                editable &&
                !!item.item &&
                (pickedProduct === null || pickedProduct === item.id_inven)
              const machine = item.item?.flow ?? null
              const width = item.item?.width ?? item.width
              const description = item.item?.description ?? item.description

              return (
                <TableRow
                  key={item.id}
                  data-locked={otherDay || undefined}
                  data-divider={(board.coils && newProduct(rows, index)) || undefined}
                >
                  <TableCell>
                    {board.coils && editable ? (
                      <Checkbox
                        aria-label={`Select ${item.id_inven ?? item.id}`}
                        checked={picked.has(item.id)}
                        disabled={!pickable}
                        onCheckedChange={() =>
                          setPicked(current => {
                            const next = new Set(current)
                            if (!next.delete(item.id)) next.add(item.id)
                            return next
                          })
                        }
                      />
                    ) : otherDay ? (
                      <Lock
                        className='size-3.5 text-muted-foreground'
                        aria-label={
                          itemDay ? `Scheduled ${formatDate(itemDay)}` : 'Not yet scheduled'
                        }
                      />
                    ) : null}
                  </TableCell>

                  {columns.cells({
                    qty: (
                      <TableCell>
                        <span className='font-mono'>{item.quantity}</span>
                      </TableCell>
                    ),
                    shipped: (
                      <TableCell>
                        <span className='font-mono'>{item.shipped || '—'}</span>
                      </TableCell>
                    ),
                    vent: (
                      <TableCell>
                        {/* Nothing left to make means nothing to vent, bypassed work is never vented, and
                            a line on another day is answered from its own row — none of them is an
                            unticked box. */}
                        {otherDay ? (
                          <span className='text-muted-foreground'>—</span>
                        ) : bypassed ? (
                          <span className='text-muted-foreground'>N/A</span>
                        ) : toMake(item) <= 0 ? (
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
                    ),
                    machine: (
                      <TableCell>
                        {otherDay ? (
                          <span className='text-muted-foreground'>—</span>
                        ) : bypassed ? (
                          <span className='text-muted-foreground'>N/A</span>
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
                                {stations?.map(option => (
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
                    ),
                    stock: (
                      <TableCell>
                        {/* Match the ordered quantity and the server moves the line to Stock on its
                            own. Stock stays open after release — the floor pulls more as it finds it —
                            and only a line on another day is answered from its own row. The key
                            remounts the box whenever the server's value moves under it. */}
                        {otherDay ? (
                          <span className='font-mono text-muted-foreground'>{fromStock}</span>
                        ) : (
                          <Input
                            key={fromStock}
                            type='number'
                            min={0}
                            max={item.quantity}
                            aria-label={`From stock for ${item.id_inven ?? item.id}`}
                            placeholder='0'
                            defaultValue={fromStock}
                            onBlur={event =>
                              commitNumber(
                                event.currentTarget,
                                fromStock,
                                { min: 0, max: item.quantity },
                                (next, revert) => edit(item, { pull_from_stock: next }, revert)
                              )
                            }
                          />
                        )}
                      </TableCell>
                    ),
                    status: (
                      <TableCell>
                        <span className={cn(otherDay && 'opacity-50')}>
                          <StatusPill status={itemStatus(status)} />
                        </span>
                      </TableCell>
                    ),
                    pid: (
                      <TableCell>
                        <span className='font-mono'>{item.id_inven ?? '—'}</span>
                      </TableCell>
                    ),
                    desc: (
                      <TableCell>
                        {editable ? (
                          <Input
                            key={description ?? ''}
                            aria-label={`Description for ${item.id_inven ?? item.id}`}
                            placeholder='Add a description'
                            defaultValue={description ?? ''}
                            onBlur={event => {
                              const input = event.currentTarget
                              if (input.value !== (description ?? ''))
                                edit(item, { description: input.value }, () => {
                                  input.value = description ?? ''
                                })
                            }}
                          />
                        ) : (
                          <span className='truncate'>{description ?? '—'}</span>
                        )}
                      </TableCell>
                    ),
                    w: (
                      <TableCell>
                        {editable ? (
                          <Input
                            key={width ?? ''}
                            type='number'
                            min={0}
                            step={0.1}
                            aria-label={`Width for ${item.id_inven ?? item.id}`}
                            placeholder='0'
                            defaultValue={width ?? ''}
                            onBlur={event =>
                              commitNumber(event.currentTarget, width, { min: 0 }, (next, revert) =>
                                edit(item, { width: next }, revert)
                              )
                            }
                          />
                        ) : (
                          <span className='font-mono'>
                            {width === null ? '—' : width.toFixed(1)}
                          </span>
                        )}
                      </TableCell>
                    ),
                    l: (
                      <TableCell>
                        <span
                          className={cn(
                            'font-mono',
                            otherDay ? 'text-muted-foreground' : offLength && 'text-destructive'
                          )}
                          title={
                            offLength
                              ? `Non-standard length (not ${board.standardLength}")`
                              : undefined
                          }
                        >
                          {item.length === null ? '—' : `${item.length}"`}
                        </span>
                      </TableCell>
                    ),
                    supplier: (
                      <TableCell>
                        <span className={cn('truncate', coil.locked && 'text-muted-foreground')}>
                          {coil.supplier}
                        </span>
                      </TableCell>
                    ),
                    coil: (
                      <TableCell>
                        <span className='flex items-center gap-1.5'>
                          <CoilIcon icon={coil.icon} />
                          <span
                            className={cn(
                              'truncate font-mono',
                              coil.locked && 'text-muted-foreground'
                            )}
                          >
                            {coil.coilNumber}
                          </span>
                        </span>
                      </TableCell>
                    ),
                    notes: (
                      <TableCell>
                        <NoteButton
                          state={noteState(item.id)}
                          label='Line item notes'
                          onClick={() => onOpenNotes(item, otherDay)}
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

      {board.coils ? (
        <CoilAssignDialog
          lines={pickedLines}
          open={assigning}
          onOpenChange={setAssigning}
          onAssigned={() => setPicked(new Set())}
        />
      ) : null}
    </div>
  )
}
