import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from 'cn'
import { useState } from 'react'
import { useUpdateCutlistRow, type CutlistRow, type Machine } from '../api'
import { groupRows, machineQuantity, type CutlistGroup } from '../lib/cutlists'
import { ConfirmDialog } from './confirm-dialog'

/** A quantity of nothing is a dash: the eye is looking for the columns that carry work. */
const Figure = ({ value }: { value: number }) =>
  value ? (
    <span className='font-mono'>{value}</span>
  ) : (
    <span className='text-muted-foreground'>—</span>
  )

type CompleteCellProps = {
  group: CutlistGroup
  disabled: boolean
  onComplete: (complete: boolean) => void
}

/** Ticking is silent; unticking asks first — reopening a row undoes somebody's sign-off. */
const CompleteCell = ({ group, disabled, onComplete }: CompleteCellProps) => {
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      {/* `inline-flex`: the row's crossing-out is drawn across its cells, and does not reach into an
          atomic inline box — which is how the sign-off itself stays unstruck. */}
      <label className='inline-flex items-center gap-2'>
        <Checkbox
          aria-label={`Complete ${group.width ?? '—'} × ${group.length ?? '—'}`}
          checked={group.complete}
          disabled={disabled}
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
        description='The row reopens. A trim a machine has already bent stays bent — this is about the row, not the material.'
        confirmLabel='Yes'
        onConfirm={() => {
          onComplete(false)
          setConfirming(false)
        }}
      />
    </>
  )
}

type OperatorNotesCellProps = {
  rows: CutlistRow[]
  disabled: boolean
  onSave: (text: string) => void
}

/**
 * "NOT connected to anything, it is just a place for the operator to make notes to help keep track of
 * things while cutting." It is saved when the field is left rather than on every keystroke.
 */
const OperatorNotesCell = ({ rows, disabled, onSave }: OperatorNotesCellProps) => {
  const saved = rows.find(row => row.operator_notes)?.operator_notes ?? ''
  const [draft, setDraft] = useState(saved)

  return (
    <Input
      aria-label='Operator notes'
      placeholder='Notes…'
      disabled={disabled}
      value={draft}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => draft !== saved && onSave(draft)}
    />
  )
}

type CutlistRowsProps = {
  rows: CutlistRow[]
  /** The Slinet reads its list sideways: one line per size, the machines as columns. */
  isSlinet: boolean
  machines: Machine[]
  readOnly: boolean
  onOpenTotal: (group: CutlistGroup) => void
}

export const CutlistRows = ({
  rows,
  isSlinet,
  machines,
  readOnly,
  onOpenTotal
}: CutlistRowsProps) => {
  const update = useUpdateCutlistRow()
  const groups = groupRows(rows)

  const setComplete = (group: CutlistGroup, complete: boolean) =>
    group.rows.forEach(row => update.mutate({ rowId: row.id, edit: { complete } }))

  const setNotes = (group: CutlistGroup, operator_notes: string) =>
    group.rows.forEach(row => update.mutate({ rowId: row.id, edit: { operator_notes } }))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>W&quot;</TableHead>
          <TableHead>L&quot;</TableHead>
          <TableHead>{isSlinet ? 'Total' : 'Qty to Manufacture'}</TableHead>
          {isSlinet ? (
            <>
              {machines.map(machine => (
                <TableHead key={machine.id}>{machine.name}</TableHead>
              ))}
              <TableHead>Vented</TableHead>
            </>
          ) : (
            <TableHead>Orders</TableHead>
          )}
          <TableHead>Operator Notes</TableHead>
          <TableHead>Complete</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map(group => (
          <TableRow key={group.key} data-complete={group.complete ? true : undefined}>
            <TableCell>
              <span className='font-mono'>{group.width?.toFixed(1) ?? '—'}</span>
            </TableCell>
            <TableCell>
              {/* Anything but the standard 120" is worth a second look before it is cut. */}
              <span className={cn('font-mono', !group.isStandardLength && 'text-destructive')}>
                {group.length ?? '—'}&quot;
              </span>
            </TableCell>
            <TableCell>
              <Button variant='link' onClick={() => onOpenTotal(group)}>
                <span className='font-mono'>{group.quantity}</span>
              </Button>
            </TableCell>

            {isSlinet ? (
              <>
                {machines.map(machine => (
                  <TableCell key={machine.id}>
                    <Figure value={machineQuantity(group, machine.id)} />
                  </TableCell>
                ))}
                <TableCell>
                  <Figure value={group.vented} />
                </TableCell>
              </>
            ) : (
              <TableCell>
                <span className='text-muted-foreground'>
                  {group.sources.length} line{group.sources.length === 1 ? '' : 's'}
                </span>
              </TableCell>
            )}

            <TableCell>
              <OperatorNotesCell
                rows={group.rows}
                disabled={readOnly}
                onSave={text => setNotes(group, text)}
              />
            </TableCell>
            <TableCell>
              <CompleteCell
                group={group}
                disabled={readOnly}
                onComplete={complete => setComplete(group, complete)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
