import { useColumnOrder } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from 'cn'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useUpdateCutlistRow, type CutlistRow, type Machine, type WrappingRow } from '../api'
import { groupRows, machineQuantity, slinetColumns, type CutlistGroup } from '../lib/cutlists'
import { ConfirmDialog } from './confirm-dialog'
import { Figure } from './figure'
import { NoteInput } from './note-input'

type CompleteCellProps = {
  group: CutlistGroup
  /** A machine cannot sign off a bend on material the Slinet has not cut yet. */
  waiting: boolean
  onComplete: (complete: boolean) => void
}

/** Ticking is silent; unticking asks first — reopening a row undoes somebody's sign-off. */
const CompleteCell = ({ group, waiting, onComplete }: CompleteCellProps) => {
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
            : waiting
              ? 'Waiting on Slinet cut'
              : 'Mark this row complete'
        }
      >
        <Checkbox
          aria-label={`Complete ${group.width ?? '—'} × ${group.length ?? '—'}`}
          checked={group.complete}
          disabled={waiting && !group.complete}
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
 * one — says how many it holds instead, and the line is reached from its order.
 */
const RemanufactureCell = ({ group, lines, onRemanufacture }: RemanufactureCellProps) => {
  const items = new Set(group.sources.map(source => source.origin_item))
  if (group.complete) return <span className='text-muted-foreground'>—</span>
  if (items.size > 1)
    return (
      <span
        className='text-xs text-muted-foreground'
        title='Open the order to remanufacture a specific line'
      >
        {items.size} orders
      </span>
    )

  const [item] = items
  const line = item ? lines.get(item) : undefined
  return (
    <Button
      variant='ghost'
      size='icon-sm'
      aria-label={`Remanufacture ${group.width ?? '—'} × ${group.length ?? '—'}`}
      title={line ? 'Remanufacture' : 'This line is not on the board any more'}
      disabled={!line}
      onClick={() => line && onRemanufacture(line)}
    >
      <RefreshCw />
    </Button>
  )
}

type CutlistRowsProps = {
  rows: CutlistRow[]
  /** The Slinet reads its list sideways: one line per size, the machines as columns. */
  isSlinet: boolean
  machines: Machine[]
  /** Whether the Slinet has cut a line of this bendlist; the Slinet's own list is never waiting. */
  isCut: (group: CutlistGroup) => boolean
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
  machines,
  isCut,
  lines,
  onOpenTotal,
  onRemanufacture
}: CutlistRowsProps) => {
  const update = useUpdateCutlistRow()
  const groups = groupRows(rows)
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
      { key: 'qty', label: isSlinet ? 'Total' : 'Qty to Manufacture' },
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
        : [{ key: 'reman', label: 'Remanufacture' }]),
      { key: 'complete', label: 'Complete' }
    ]
  })

  const edit = (group: CutlistGroup, patch: { complete?: boolean; operator_notes?: string }) =>
    group.rows.forEach(row => update.mutate({ rowId: row.id, edit: patch }))

  return (
    <Table>
      <TableHeader>
        <TableRow>{columns.headers}</TableRow>
      </TableHeader>
      <TableBody>
        {groups.map(group => (
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
                  <span className={cn('font-mono', !group.isStandardLength && 'text-destructive')}>
                    {group.length ?? '—'}&quot;
                  </span>
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
                  <RemanufactureCell
                    group={group}
                    lines={lines}
                    onRemanufacture={onRemanufacture}
                  />
                </TableCell>
              ),
              complete: (
                <TableCell>
                  <CompleteCell
                    group={group}
                    waiting={!isCut(group)}
                    onComplete={complete => edit(group, { complete })}
                  />
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
