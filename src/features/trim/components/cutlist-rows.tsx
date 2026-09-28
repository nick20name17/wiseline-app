import { useColumnOrder } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from 'cn'
import { ChevronDown, Package, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import {
  useUpdateCutlistRow,
  useUpdateLineItem,
  type CutlistRow,
  type CutlistSource,
  type Machine,
  type Remanufacturing,
  type WrappingRow
} from '../api'
import {
  describeGroup,
  editableLines,
  groupDrawing,
  groupRows,
  linesOf,
  machineQuantity,
  slinetColumns,
  type CutlistGroup
} from '../lib/cutlists'
import { itemStatus } from '../lib/status'
import { ConfirmDialog } from './confirm-dialog'
import { Figure } from './figure'
import { KeypadDialog } from './keypad-dialog'
import { DrawingCell } from './drawing-cell'
import { LineNotesDialog } from './line-notes-dialog'
import { NoteButton } from './note-button'
import { NoteInput } from './note-input'
import { RemakePill } from './reman-badge'
import { StatusPill } from './status-pill'
import { useLineNoteState } from './use-line-note-state'

const sizeOf = (group: CutlistGroup) => `${group.width ?? '—'} × ${group.length ?? '—'}`

type CompleteCellProps = {
  group: CutlistGroup
  /** Why an open row cannot be ticked yet, or `null` when it can. */
  blocked: string | null
  onComplete: (complete: boolean) => void
}

/** Ticking is silent; unticking asks first — reopening a row undoes somebody's sign-off. */
const CompleteCell = ({ group, blocked, onComplete }: CompleteCellProps) => {
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      {/* `inline-flex`: the row's crossing-out is drawn across its cells, and does not reach into an
          atomic inline box — which is how the sign-off itself stays unstruck. The hint sits on the
          label because a disabled box shows no tooltip of its own. */}
      <label
        className='inline-flex items-center gap-2'
        title={
          group.complete
            ? 'Marked complete — uncheck to reopen (asks first)'
            : (blocked ?? 'Mark this row complete')
        }
      >
        <Checkbox
          aria-label={`Complete ${sizeOf(group)}`}
          checked={group.complete}
          disabled={!!blocked && !group.complete}
          onCheckedChange={() => (group.complete ? setConfirming(true) : onComplete(true))}
        />
        {/* Signed off reads green across the strip; outstanding stays quiet. */}
        <span
          className={cn(
            'text-sm font-medium',
            group.complete ? 'text-success' : 'text-muted-foreground'
          )}
        >
          {group.complete ? 'Yes' : 'No'}
        </span>
      </label>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title='Mark this row as NOT completed?'
        description='Are you sure you want to mark this row as NOT completed?'
        confirmLabel='Yes'
        cancelLabel='No'
        onConfirm={() => {
          onComplete(false)
          setConfirming(false)
        }}
      />
    </>
  )
}

type RemanufactureCellProps = {
  group: CutlistGroup
  lines: ReadonlyMap<string, WrappingRow>
  onRemanufacture: (line: WrappingRow) => void
}

/**
 * A remake is asked for one line at a time, so a consolidated row — several orders' pieces cut as
 * one — first asks which order's pieces are being remade.
 */
const RemanufactureCell = ({ group, lines, onRemanufacture }: RemanufactureCellProps) => {
  const { lines: count, originItem: item } = describeGroup(group)
  if (group.complete) return <span className='text-muted-foreground'>—</span>
  if (count > 1) {
    const onBoard = linesOf(group).flatMap(source => {
      const line = source.origin_item ? lines.get(source.origin_item) : undefined
      return line ? [line] : []
    })
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant='ghost'
              size='sm'
              aria-label={`Remanufacture ${sizeOf(group)}`}
              disabled={!onBoard.length}
            />
          }
        >
          <RefreshCw data-icon='inline-start' />
          {count} orders
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='min-w-48'>
          {/* Base UI throws for a group label outside a group. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Remake which order&apos;s pieces?</DropdownMenuLabel>
            {onBoard.map(line => (
              <DropdownMenuItem key={line.origin_item} onClick={() => onRemanufacture(line)}>
                <span className='font-mono'>{line.order_number ?? line.order}</span>
                <span className='ml-auto text-muted-foreground'>{line.qty_ordered} pcs</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const line = item ? lines.get(item) : undefined
  return (
    <Button
      variant='ghost'
      size='icon-sm'
      aria-label={`Remanufacture ${sizeOf(group)}`}
      title={line ? 'Remanufacture' : 'This line is not on the board any more'}
      disabled={!line}
      onClick={() => line && onRemanufacture(line)}
    >
      <RefreshCw />
    </Button>
  )
}

type EditableLine = ReturnType<typeof editableLines>[number]

const orderOf = (line: CutlistSource) => line.order_number ?? line.order

type MachineCellProps = {
  group: CutlistGroup
  machines: Machine[]
  onMove: (line: EditableLine, machine: Machine) => void
}

/**
 * «Workers needs to be able to change the Machine a line item is assigned to» p1 (650,338): the line
 * leaves this bendlist for a new one on the other machine. A machine is assigned per line, so a
 * consolidated row first asks whose pieces move.
 */
const MachineCell = ({ group, machines, onMove }: MachineCellProps) => {
  // Every row of a bendlist carries the list's own machine.
  const current = group.rows[0]?.machine
  const others = machines.filter(machine => machine.id !== current)
  const lines = editableLines(group)
  const moveTo = (line: EditableLine) =>
    others.map(machine => (
      <DropdownMenuItem key={machine.id} onClick={() => onMove(line, machine)}>
        {machine.name ?? `Machine ${machine.id}`}
      </DropdownMenuItem>
    ))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='outline'
            size='sm'
            aria-label={`Change the machine for ${sizeOf(group)}`}
            disabled={!lines.length || !others.length}
          />
        }
      >
        Machine
        <ChevronDown data-icon='inline-end' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='min-w-48'>
        {/* Base UI throws for a group label outside a group. */}
        <DropdownMenuGroup>
          {lines.length > 1 ? (
            <>
              <DropdownMenuLabel>Move which order&apos;s pieces?</DropdownMenuLabel>
              {lines.map(line => (
                <DropdownMenuSub key={line.item_id}>
                  <DropdownMenuSubTrigger>
                    <span className='font-mono'>{orderOf(line)}</span>
                    <span className='text-muted-foreground'>{line.quantity} pcs</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className='min-w-40'>
                    {moveTo(line)}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </>
          ) : (
            <>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {lines[0] ? moveTo(lines[0]) : null}
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type StockCellProps = {
  group: CutlistGroup
  onStock: (line: EditableLine) => void
}

/**
 * «If a worker damages a piece and decides to use some from stock then he needs to be able to enter
 * that into the Stock column» p1 (700,451); the column opens a keypad p1 (714,470). A stock order
 * puts trims on the shelf rather than taking them off it, so its lines are not offered.
 */
const StockCell = ({ group, onStock }: StockCellProps) => {
  const figure = <Figure value={describeGroup(group).fromStock || null} />
  const lines = editableLines(group).filter(line => !line.is_stock)
  const label = `Stock for ${sizeOf(group)}`
  const [first] = lines
  if (!first) return figure
  if (lines.length > 1)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant='link' aria-label={label} />}>
          {figure}
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='min-w-48'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Pull stock for which order?</DropdownMenuLabel>
            {lines.map(line => (
              <DropdownMenuItem key={line.item_id} onClick={() => onStock(line)}>
                <span className='font-mono'>{orderOf(line)}</span>
                <span className='ml-auto text-muted-foreground'>
                  {line.pull_from_stock ?? 0} of {line.qty_ordered ?? 0}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  return (
    <Button
      variant='link'
      aria-label={label}
      title='Pull from stock'
      onClick={() => onStock(first)}
    >
      {figure}
    </Button>
  )
}

type CutlistRowsProps = {
  rows: CutlistRow[]
  /** The request a remake list came from; `null` on the day's own lists. */
  remake: Remanufacturing | null
  /** The Slinet reads its list sideways: one line per size, the machines as columns. */
  isSlinet: boolean
  machines: Machine[]
  /** Why nothing open on the list can be completed yet, or `null` when it can. */
  blocked: string | null
  /**
   * The rows' lines can still be moved to another machine or pulled from stock: only an ordinary
   * bendlist not yet Done moves with its lines — a remake's lists belong to the remake.
   */
  lineEdits: boolean
  /** The released line items by autoid — what a bendlist row's Remanufacture opens. */
  lines: ReadonlyMap<string, WrappingRow>
  onOpenTotal: (group: CutlistGroup) => void
  onRemanufacture: (line: WrappingRow) => void
}

/**
 * The rows of a list. A completed list keeps them workable: a row signed off by mistake can still be
 * reopened, and the notes still typed into, after the list itself is Done.
 */
export const CutlistRows = ({
  rows,
  isSlinet,
  remake,
  machines,
  blocked,
  lineEdits,
  lines,
  onOpenTotal,
  onRemanufacture
}: CutlistRowsProps) => {
  const update = useUpdateCutlistRow()
  // A bendlist's lines are released by definition.
  const updateLine = useUpdateLineItem({ released: true })
  const [moving, setMoving] = useState<{ line: EditableLine; machine: Machine } | null>(null)
  const [stocking, setStocking] = useState<EditableLine | null>(null)
  const groups = groupRows(rows, { byProduct: !isSlinet })
  const [noteItem, setNoteItem] = useState<string | null>(null)
  // Only a bendlist carries the notes column, so only it asks for their state.
  const noteState = useLineNoteState(
    // Deduplicated and sorted: the list is the query key, and the same lines in another order are
    // the same question.
    isSlinet
      ? []
      : [...new Set(groups.flatMap(group => describeGroup(group).originItem ?? []))].sort()
  )
  const machineColumns = slinetColumns(machines)
  const machineKey = (column: (typeof machineColumns)[number]) =>
    column.kind === 'vented' ? 'vented' : `machine-${column.machine.id}`
  // Machines are columns of the Slinet's list, so they move like the rest; one added later lands
  // beside the machine it is declared after.
  const columns = useColumnOrder({
    table: isSlinet ? 'cutlist-slinet' : 'cutlist-bend',
    columns: [
      { key: 'w', label: 'W"' },
      { key: 'l', label: 'L"' },
      // The board's bendlist: Qty to Manufacture is Qty Ordered less Stock, so the two sit before it.
      ...(isSlinet
        ? []
        : [
            { key: 'ordered', label: 'Qty Ordered' },
            { key: 'stock', label: 'Stock' }
          ]),
      { key: 'qty', label: isSlinet ? 'Total' : 'Qty to Manufacture' },
      // p1 (478,586): the Slinet's recut list carries its own Recut column.
      ...(isSlinet && remake ? [{ key: 'recut', label: 'Recut' }] : []),
      ...(isSlinet
        ? []
        : [
            { key: 'pid', label: 'ID' },
            { key: 'desc', label: 'Description' },
            { key: 'machine', label: 'Machine' }
          ]),
      ...(isSlinet
        ? [
            ...machineColumns.map(column => ({
              key: machineKey(column),
              label:
                column.kind === 'vented'
                  ? 'Vented'
                  : (column.machine.name ?? `Machine ${column.machine.id}`)
            })),
            { key: 'op', label: 'Operator Notes' }
          ]
        : [
            { key: 'reman', label: 'Remanufacture' },
            { key: 'status', label: 'Status' },
            { key: 'drawing', label: 'Drawing' },
            { key: 'notes', label: 'Line Item Notes' }
          ]),
      { key: 'complete', label: 'Complete' }
    ]
  })

  const edit = (group: CutlistGroup, patch: { complete?: boolean; operator_notes?: string }) =>
    group.rows.forEach(row => update.mutate({ rowId: row.id, edit: patch }))

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>{columns.headers}</TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(group => {
            const about = describeGroup(group)
            const item = about.originItem
            return (
              <TableRow key={group.key} data-complete={group.complete ? true : undefined}>
                {columns.cells({
                  w: (
                    <TableCell>
                      <span className='font-mono'>{group.width?.toFixed(1) ?? '—'}</span>
                    </TableCell>
                  ),
                  l: (
                    <TableCell>
                      {/* Anything but the standard 120" is worth a second look before it is cut. */}
                      <span
                        className={cn('font-mono', !group.isStandardLength && 'text-destructive')}
                      >
                        {group.length ?? '—'}&quot;
                      </span>
                    </TableCell>
                  ),
                  ordered: (
                    <TableCell>
                      {/* A remake asked for at the bench shows only what was asked for; one from a
                          machine keeps the full Qty Ordered (p1 (612,482), (653,546)). */}
                      <Figure
                        value={
                          remake?.source === 'wrapping' ? group.quantity : about.ordered || null
                        }
                      />
                    </TableCell>
                  ),
                  recut: (
                    <TableCell>
                      <RemakePill done={group.complete}>{group.quantity}</RemakePill>
                    </TableCell>
                  ),
                  stock: (
                    <TableCell>
                      {lineEdits && !group.complete ? (
                        <StockCell group={group} onStock={setStocking} />
                      ) : (
                        <Figure value={about.fromStock || null} />
                      )}
                    </TableCell>
                  ),
                  machine: (
                    <TableCell>
                      {/* «When a row is marked as Complete ... the Machine button would disappear»
                          p1 (653,358). */}
                      {lineEdits && !group.complete ? (
                        <MachineCell
                          group={group}
                          machines={machines}
                          onMove={(line, machine) => setMoving({ line, machine })}
                        />
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                  ),
                  pid: (
                    <TableCell>
                      {/* A row cutting several orders' pieces is opened through its Total. */}
                      <span className='inline-flex items-center gap-1.5 font-mono'>
                        {about.isStock ? (
                          <Package
                            className='size-3.5 text-muted-foreground'
                            aria-label='Stock order'
                          />
                        ) : null}
                        {about.productId ??
                          (about.lines > 1 ? (
                            <span className='text-xs text-muted-foreground'>
                              {about.lines} lines
                            </span>
                          ) : (
                            '—'
                          ))}
                      </span>
                    </TableCell>
                  ),
                  desc: (
                    <TableCell>
                      <span className='truncate text-muted-foreground'>
                        {about.description ?? '—'}
                      </span>
                    </TableCell>
                  ),
                  status: (
                    <TableCell>
                      <StatusPill status={itemStatus(about.status)} />
                    </TableCell>
                  ),
                  qty: (
                    <TableCell>
                      <Button
                        variant='link'
                        title='See orders using this size'
                        onClick={() => onOpenTotal(group)}
                      >
                        <span className='font-mono'>{group.quantity}</span>
                      </Button>
                    </TableCell>
                  ),
                  ...Object.fromEntries(
                    machineColumns.map(column => [
                      machineKey(column),
                      // `cells` keys its own wrapper; this one only satisfies the lint, which sees an array.
                      <TableCell key={machineKey(column)}>
                        {/* A quantity of nothing is a dash: the eye is looking for the columns that
                        carry work. */}
                        <Figure
                          value={
                            (column.kind === 'vented'
                              ? group.vented
                              : machineQuantity(group, column.machine.id)) || null
                          }
                        />
                      </TableCell>
                    ])
                  ),
                  op: (
                    <TableCell>
                      {/* "NOT connected to anything, it is just a place for the operator to make notes to
                      help keep track of things while cutting." */}
                      <NoteInput
                        aria-label='Operator notes'
                        placeholder='Notes…'
                        saved={group.rows.find(row => row.operator_notes)?.operator_notes ?? ''}
                        onSave={operator_notes => edit(group, { operator_notes })}
                      />
                    </TableCell>
                  ),
                  reman: (
                    <TableCell>
                      {/* On a remake list the column says what is being remade, green once the
                          Slinet has recut it (p1 (608,446), (613,462), (686,501)). */}
                      {remake ? (
                        <RemakePill done={remake.is_cut}>
                          {remake.remanufacturing_qty ?? group.quantity}
                        </RemakePill>
                      ) : (
                        <RemanufactureCell
                          group={group}
                          lines={lines}
                          onRemanufacture={onRemanufacture}
                        />
                      )}
                    </TableCell>
                  ),
                  drawing: (
                    <TableCell>
                      <DrawingCell drawing={groupDrawing(group)} product={about.productId} />
                    </TableCell>
                  ),
                  notes: (
                    <TableCell>
                      {/* A thread belongs to one line item; a row cutting several orders' pieces is
                      reached through its order instead, as with Remanufacture. */}
                      {item ? (
                        <NoteButton
                          state={noteState(item)}
                          label={`Line notes for ${lines.get(item)?.description ?? item}`}
                          onClick={() => setNoteItem(item)}
                        />
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                  ),
                  complete: (
                    <TableCell>
                      <CompleteCell
                        group={group}
                        blocked={blocked}
                        onComplete={complete => edit(group, { complete })}
                      />
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!moving}
        onOpenChange={open => !open && setMoving(null)}
        title={`Move to ${moving?.machine.name ?? 'another machine'}?`}
        description={
          moving
            ? `${orderOf(moving.line) ?? 'This line'}'s ${moving.line.quantity} pcs leave this bendlist for a new one on ${moving.machine.name ?? 'that machine'}.`
            : ''
        }
        confirmLabel='Move'
        cancelLabel='Cancel'
        isPending={updateLine.isPending}
        onConfirm={() =>
          moving &&
          updateLine.mutate(
            { itemId: moving.line.item_id, edit: { flow: moving.machine.id } },
            { onSuccess: () => setMoving(null) }
          )
        }
      />

      {/* Stock is the line's whole figure, «anything from zero up to the Qty Ordered» p1 (699,482);
          the server lowers Qty to Manufacture on the rows not done yet. */}
      <KeypadDialog
        target={
          stocking
            ? {
                title: `Stock for ${orderOf(stocking) ?? stocking.product_id ?? 'this line'}`,
                current: stocking.pull_from_stock ?? 0,
                max: stocking.qty_ordered ?? 0
              }
            : null
        }
        isPending={updateLine.isPending}
        onOpenChange={open => !open && setStocking(null)}
        onEnter={value =>
          stocking &&
          updateLine.mutate(
            { itemId: stocking.item_id, edit: { pull_from_stock: value } },
            { onSuccess: () => setStocking(null) }
          )
        }
      />

      <LineNotesDialog
        originItem={noteItem}
        productId={(noteItem && lines.get(noteItem)?.description) ?? ''}
        onOpenChange={open => !open && setNoteItem(null)}
      />
    </>
  )
}
