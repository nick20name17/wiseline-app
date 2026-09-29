import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { useState } from 'react'
import { formatCount } from '../lib/format'
import {
  coilChoicesQuery,
  coilNumbersQuery,
  useAssignCoil,
  useMarkSlit,
  type BoardLineItem
} from '../api'

// The select's own value for «none»; the API takes `null`.
const UNDEFINED = 'undefined'

/**
 * The same choice made twice over: the Manager assigning a coil to roll from p2 (563,488), and the Slit
 * Line recording the coil it slit from p2 (1086,349).
 */
type CoilAction = 'assign' | 'slit'

/** A line the coil is for, named the way the dialog prints it. */
export type CoilLine = Pick<BoardLineItem, 'id' | 'id_inven'>

type CoilAssignFormProps = { lines: CoilLine[]; action: CoilAction; onDone: () => void }

const CoilAssignForm = ({ lines, action, onDone }: CoilAssignFormProps) => {
  // The lines are one Product ID p2 (540,467), so any of them names the coils.
  const first = lines[0]?.id ?? null
  const { data: choices, isPending } = useQuery(coilChoicesQuery(first))
  const [supplier, setSupplier] = useState<string | null>(null)
  const [coilNumber, setCoilNumber] = useState('')
  const [coil, setCoil] = useState<string | null>(null)
  const { data: lots, isPending: lotsPending } = useQuery(coilNumbersQuery(coil))
  const assign = useAssignCoil()
  const markSlit = useMarkSlit()
  const save = action === 'slit' ? markSlit : assign

  return (
    <form
      noValidate
      onSubmit={event => {
        event.preventDefault()
        save.mutate(
          {
            originItems: lines.map(line => line.id),
            supplier,
            coilNumber: supplier && coilNumber.trim() ? coilNumber.trim() : null
          },
          { onSuccess: onDone }
        )
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor='coil-supplier'>Supplier</FieldLabel>
          {/* «This drop down of Suppliers» p2 (678,460): the suppliers of this colour and gauge. */}
          <Select
            value={supplier ?? UNDEFINED}
            onValueChange={value => {
              const next = value === UNDEFINED ? null : value
              setSupplier(next)
              if (!next) setCoilNumber('')
            }}
          >
            <SelectTrigger id='coil-supplier'>
              <SelectValue>
                {(value: string) => (value === UNDEFINED ? 'Undefined — any supplier' : value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNDEFINED}>Undefined — any supplier</SelectItem>
              {choices?.suppliers.map(name => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isPending && !choices?.suppliers.length ? (
            <FieldDescription>No coil in EBMS matches this colour and gauge.</FieldDescription>
          ) : null}
        </Field>

        <Field data-disabled={!supplier || undefined}>
          <FieldLabel htmlFor='coil-number'>Coil Number</FieldLabel>
          {/* «greyed out and unavailable if no Supplier has been selected» p2 (709,459). */}
          <InputGroup>
            <InputGroupInput
              id='coil-number'
              placeholder='Undefined — any coil'
              disabled={!supplier}
              value={coilNumber}
              onChange={event => setCoilNumber(event.target.value)}
            />
          </InputGroup>
          <FieldDescription>Type it, or pick a Lot Number from a coil below.</FieldDescription>
        </Field>

        {supplier ? (
          <div className='grid gap-3 sm:grid-cols-2'>
            <section aria-label='Coils' className='rounded-lg border border-border'>
              {isPending ? (
                <Skeleton className='h-24' />
              ) : (
                <ul className='scrollport max-h-56 overflow-y-auto'>
                  {choices?.coils.map(option => (
                    <li key={option.product_id}>
                      <button
                        type='button'
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm hover:bg-muted',
                          coil === option.product_id && 'bg-primary/10'
                        )}
                        aria-pressed={coil === option.product_id}
                        onClick={() => setCoil(option.product_id)}
                      >
                        <span className='block font-mono'>{option.product_id}</span>
                        <span className='block truncate text-xs text-muted-foreground'>
                          {[option.description, `${option.width}" wide`]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label='Lot Numbers' className='rounded-lg border border-border'>
              {!coil ? (
                <p className='px-3 py-2 text-sm text-muted-foreground'>
                  Pick a coil to see its Lot Numbers.
                </p>
              ) : lotsPending ? (
                <Skeleton className='h-24' />
              ) : lots?.length ? (
                <ul className='scrollport max-h-56 overflow-y-auto'>
                  {lots.map(lot => (
                    <li key={lot.coil_number}>
                      <button
                        type='button'
                        className='flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-muted'
                        onClick={() => setCoilNumber(lot.coil_number)}
                      >
                        <span className='font-mono'>{lot.coil_number}</span>
                        <span className='text-xs text-muted-foreground'>
                          {formatCount(lot.on_hand)} ft left
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='px-3 py-2 text-sm text-muted-foreground'>
                  No Lot Number with anything left on it.
                </p>
              )}
            </section>
          </div>
        ) : null}
      </FieldGroup>

      <div className='mt-6 flex justify-end gap-2'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={save.isPending}>
          {save.isPending ? <Spinner data-icon='inline-start' /> : null}
          {action === 'slit' ? 'Mark slit' : 'Assign'}
        </Button>
      </div>
    </form>
  )
}

type CoilAssignDialogProps = {
  lines: CoilLine[]
  action: CoilAction
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
}

/**
 * «Select Supplier / Coil Number» p2 (563,488): leave both Undefined, name a Supplier only, or a
 * Supplier and a Coil Number — a Coil Number only under a Supplier.
 */
export const CoilAssignDialog = ({
  lines,
  action,
  open,
  onOpenChange,
  onAssigned
}: CoilAssignDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className='sm:max-w-2xl'>
      <DialogHeader>
        <DialogTitle>
          {action === 'slit' ? 'Mark slit' : 'Select Supplier / Coil Number'}
        </DialogTitle>
        <DialogDescription>
          {lines.length} line{lines.length === 1 ? '' : 's'} of {lines[0]?.id_inven ?? '—'}
        </DialogDescription>
      </DialogHeader>
      {/* The popup unmounts once closed, so the next opening starts from Undefined. */}
      <CoilAssignForm
        lines={lines}
        action={action}
        onDone={() => {
          onOpenChange(false)
          onAssigned()
        }}
      />
    </DialogContent>
  </Dialog>
)
