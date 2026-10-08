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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { useState } from 'react'
import { coilsByFolder, type CoilChoice } from '../lib/coils'
import { formatCount } from '../lib/format'
import {
  coilChoicesQuery,
  coilFoldersQuery,
  coilNumbersQuery,
  departmentCoilLotsQuery,
  useAssignCoil,
  useFillInCoil,
  useMarkSlit,
  useSlitRequest,
  type BoardLineItem,
  type UnitCoil
} from '../api'
import { fillEntries, unitRuns } from '../lib/unit-coils'

// The select's own value for «none»; the API takes `null`.
const UNDEFINED = 'undefined'

/**
 * The same choice made three times over: the Manager assigning a coil to roll from p2 (563,488), the
 * Manager sending lines to the Slit Line with the coil chosen for them p2 (586,558), and the Slit Line
 * recording the coil it slit from p2 (1086,349).
 */
type CoilAction = 'assign' | 'request' | 'slit' | 'fill'

const SUBMIT: Record<CoilAction, string> = {
  assign: 'Assign',
  request: 'Create',
  slit: 'Mark slit',
  fill: 'Save'
}

const TITLE: Record<CoilAction, string> = {
  assign: 'Select Supplier / Coil Number',
  request: 'Send to the Slit Line',
  slit: 'Mark slit',
  // The Worker filling in what the Manager left Undefined, after release p2 (894,313).
  fill: 'Supplier / Coil Number'
}

/** A line the coil is for, named the way the dialog prints it. */
export type CoilLine = Pick<BoardLineItem, 'id' | 'id_inven'>

/** What the line already has, and which of it the Manager or the Slit Line set and so locked. */
export type CoilCurrent = Pick<
  NonNullable<BoardLineItem['item']>,
  'supplier' | 'coil_number' | 'supplier_locked' | 'coil_number_locked'
>

/**
 * A line split by coil p2 (679,416): the Manager assigns the units ticked, per line; the Worker fills
 * in the units still without one.
 */
type CoilUnits = { assign?: Record<string, number[]>; fill?: UnitCoil[] | null }

type CoilAssignFormProps = {
  lines: CoilLine[]
  action: CoilAction
  departmentId: number | undefined
  current?: CoilCurrent
  units?: CoilUnits
  onDone: () => void
}

/** The units filled in at once start from the first's coil; a field is locked only if on all of them. */
const currentOf = (units: UnitCoil[]): CoilCurrent => ({
  supplier: units[0]?.supplier ?? null,
  coil_number: units[0]?.coil_number ?? null,
  supplier_locked: units.every(unit => unit.supplier_locked),
  coil_number_locked: units.every(unit => unit.coil_number_locked)
})

const CoilAssignForm = ({
  lines,
  action,
  departmentId,
  current: lineCurrent,
  units,
  onDone
}: CoilAssignFormProps) => {
  const current = units?.fill?.length ? currentOf(units.fill) : lineCurrent
  // The lines are one Product ID p2 (540,467), so any of them names the coils.
  const first = lines[0]?.id ?? null
  const { data: choices, isPending: choicesPending } = useQuery(coilChoicesQuery(first))
  const [supplier, setSupplier] = useState<string | null>(current?.supplier ?? null)
  // The EBMS coil folders p2 (585,406) are a way round the colour-and-gauge match: `null` is the match.
  const [folder, setFolder] = useState<string | null>(null)
  const { data: folders } = useQuery(coilFoldersQuery(departmentId))
  const { data: departmentLots, isPending: folderLotsPending } = useQuery({
    ...departmentCoilLotsQuery(departmentId),
    enabled: departmentId !== undefined && !!supplier
  })
  const byFolder = coilsByFolder(departmentLots ?? [])
  const folderTabs = (folders ?? []).filter(entry => byFolder.has(entry.folder_id))
  const coils: CoilChoice[] =
    folder === null
      ? (choices?.coils ?? []).map(option => ({
          product_id: option.product_id,
          detail: [option.description, `${option.width}" wide`].filter(Boolean).join(' · ')
        }))
      : (byFolder.get(folder) ?? [])
  const isPending = folder === null ? choicesPending : folderLotsPending
  const [coilNumber, setCoilNumber] = useState(current?.coil_number ?? '')
  const supplierLocked = !!current?.supplier_locked
  const coilLocked = !!current?.coil_number_locked
  const [coil, setCoil] = useState<string | null>(null)
  const { data: lots, isPending: lotsPending } = useQuery(coilNumbersQuery(coil))
  const assign = useAssignCoil()
  const request = useSlitRequest()
  const markSlit = useMarkSlit()
  const fillIn = useFillInCoil()
  const pending = assign.isPending || request.isPending || markSlit.isPending || fillIn.isPending
  // The Worker fills the line in to pack it, and it packs only with both p2 (1010,346).
  const incomplete = action === 'fill' && !(supplier && coilNumber.trim())

  return (
    <form
      noValidate
      onSubmit={event => {
        event.preventDefault()
        const choice = {
          originItems: lines.map(line => line.id),
          supplier,
          coilNumber: supplier && coilNumber.trim() ? coilNumber.trim() : null
        }
        if (action === 'request') request.mutate({ ...choice, slit: true }, { onSuccess: onDone })
        else if (action === 'assign')
          assign.mutate({ ...choice, units: units?.assign }, { onSuccess: onDone })
        else if (action === 'fill')
          fillIn.mutate(
            lines.flatMap(line => fillEntries(line.id, units?.fill ?? null, choice)),
            { onSuccess: onDone }
          )
        else markSlit.mutate(choice, { onSuccess: onDone })
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor='coil-supplier'>Supplier</FieldLabel>
          {/* «This drop down of Suppliers» p2 (678,460): the suppliers of this colour and gauge. */}
          <Select
            disabled={supplierLocked}
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
              {/* A locked Supplier need not be among this colour and gauge's to stay shown. */}
              {supplier && !choices?.suppliers.includes(supplier) ? (
                <SelectItem value={supplier}>{supplier}</SelectItem>
              ) : null}
              {choices?.suppliers.map(name => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {supplierLocked ? (
            <FieldDescription>Set by the Manager — locked.</FieldDescription>
          ) : !isPending && !choices?.suppliers.length ? (
            <FieldDescription>No coil in EBMS matches this colour and gauge.</FieldDescription>
          ) : null}
        </Field>

        <Field data-disabled={!supplier || undefined}>
          <FieldLabel htmlFor='coil-number'>Coil Number</FieldLabel>
          {/* «greyed out and unavailable if no Supplier has been selected» p2 (709,459). */}
          <InputGroup>
            <InputGroupInput
              id='coil-number'
              placeholder={action === 'fill' ? 'The coil you are running' : 'Undefined — any coil'}
              disabled={!supplier || coilLocked}
              value={coilNumber}
              onChange={event => setCoilNumber(event.target.value)}
            />
          </InputGroup>
          <FieldDescription>
            {coilLocked
              ? 'Set by the Manager — locked.'
              : 'Type it, or pick a Lot Number from a coil below.'}
          </FieldDescription>
        </Field>

        {supplier && folderTabs.length ? (
          <div className='scrollport overflow-x-auto'>
            <Tabs
              value={folder ?? 'match'}
              onValueChange={value => {
                setFolder(value === 'match' ? null : String(value))
                setCoil(null)
              }}
            >
              <TabsList variant='line'>
                <TabsTrigger value='match'>This colour & gauge</TabsTrigger>
                {folderTabs.map(entry => (
                  <TabsTrigger key={entry.folder_id} value={entry.folder_id}>
                    {entry.name.trim()}
                    <span className='font-mono text-xs text-muted-foreground'>
                      {byFolder.get(entry.folder_id)?.length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        ) : null}

        {supplier && !coilLocked ? (
          <div className='grid gap-3 sm:grid-cols-2'>
            <section aria-label='Coils' className='rounded-lg border border-border'>
              {isPending ? (
                <Skeleton className='h-24' />
              ) : (
                <ul className='scrollport max-h-56 overflow-y-auto'>
                  {coils.map(option => (
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
                          {option.detail}
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
        <Button type='submit' disabled={pending || incomplete}>
          {pending ? <Spinner data-icon='inline-start' /> : null}
          {SUBMIT[action]}
        </Button>
      </div>
    </form>
  )
}

type CoilAssignDialogProps = {
  lines: CoilLine[]
  action: CoilAction
  departmentId: number | undefined
  current?: CoilCurrent
  units?: CoilUnits
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
}

/**
 * «Select Supplier / Coil Number» p2 (563,488): leave both Undefined, name a Supplier only, or a
 * Supplier and a Coil Number — a Coil Number only under a Supplier. Sent to the Slit Line, Undefined
 * reads «waiting...» until the Slit Line fills it in.
 */
export const CoilAssignDialog = ({
  lines,
  action,
  departmentId,
  current,
  units,
  open,
  onOpenChange,
  onAssigned
}: CoilAssignDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className='sm:max-w-2xl'>
      <DialogHeader>
        <DialogTitle>{TITLE[action]}</DialogTitle>
        <DialogDescription>
          {units?.fill?.length
            ? `Units ${unitRuns(units.fill.map(unit => unit.unit))} of ${lines[0]?.id_inven ?? '—'}`
            : `${lines.length} line${lines.length === 1 ? '' : 's'} of ${lines[0]?.id_inven ?? '—'}`}
        </DialogDescription>
      </DialogHeader>
      {/* The popup unmounts once closed, so the next opening starts from Undefined. */}
      <CoilAssignForm
        lines={lines}
        action={action}
        departmentId={departmentId}
        current={current}
        units={units}
        onDone={() => {
          onOpenChange(false)
          onAssigned()
        }}
      />
    </DialogContent>
  </Dialog>
)
