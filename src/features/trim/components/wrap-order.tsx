import { useColumnOrder } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ArrowLeft, Ban, Check, MapPin, Printer, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import {
  orderCompleteQuery,
  orderLocationsQuery,
  remanufacturingsQuery,
  useCompleteOrder,
  useCreatePackage,
  wrappingLocationsQuery,
  type LocationSlot,
  type OrderLocation,
  type Remanufacturing,
  type WrappingRow
} from '../api'
import { WRAP_LINES_TABLE } from '../lib/columns'
import { itemStatus } from '../lib/status'
import {
  orderOverdue,
  overWeight,
  packageTarget,
  remakeRoom,
  remanOwed,
  remanState,
  stagedQuantity,
  wrapAllowed
} from '../lib/wrapping'
import { ConfirmDialog } from './confirm-dialog'
import { LineNotesDialog } from './line-notes-dialog'
import { LocationChips, LocationDialog, RemoveLocationDialog } from './location-dialog'
import { NoteButton } from './note-button'
import { RemanBadge } from './reman-badge'
import { RemanufactureDialog } from './remanufacture-dialog'
import { StatusPill } from './status-pill'
import { useLineNoteState } from './use-line-note-state'

// The statuses a line is wrapped from: the floor has finished it, or it came off the shelf.
const READY = ['bent', 'stock', 'bypassed']

type RemanCellProps = {
  row: WrappingRow
  remans: Remanufacturing[]
  onRemake: () => void
}

/**
 * A bypassed line never went through a machine, so there is nothing to remake it on. Otherwise the
 * cell shows what is outstanding and keeps offering the request beside it: a remake can be spoiled
 * too, and asked for again.
 */
const RemanCell = ({ row, remans, onRemake }: RemanCellProps) => {
  if (row.status === 'bypassed')
    return (
      <span
        className='text-xs text-muted-foreground'
        title='Bypassed orders skip production — Remanufacture N/A'
      >
        N/A
      </span>
    )

  const room = remakeRoom(row.qty_ordered, remans)
  const made = row.status === 'bent' || row.status === 'wrapped'
  const again = remans.length ? 'Remanufacture again' : 'Remanufacture'

  return (
    <span className='flex items-center gap-1'>
      {remans.length ? <RemanBadge remans={remans} /> : null}
      {made ? (
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={`Remanufacture ${row.origin_item}`}
          disabled={!room}
          title={room ? again : `All ${row.qty_ordered} pcs. are already awaiting remanufacture`}
          onClick={onRemake}
        >
          <RefreshCw />
        </Button>
      ) : remans.length ? null : (
        <span className='text-muted-foreground' title='Available once the line is Bent'>
          —
        </span>
      )}
    </span>
  )
}

type WrapCellProps = {
  row: WrappingRow
  /** What may be wrapped from the line right now. */
  allowed: number
  staged: number
  onAmount: (amount: string) => void
}

const WrapCell = ({ row, allowed, staged, onAmount }: WrapCellProps) => {
  if (row.status === 'wrapped')
    return <span className='text-xs text-muted-foreground'>Wrapped ✓</span>

  if (row.can_wrap && allowed > 0)
    return (
      <span className='flex items-center gap-2'>
        <Input
          className='w-20'
          type='number'
          min={0}
          max={allowed}
          step={1}
          inputMode='numeric'
          aria-label={`Wrap from ${row.origin_item}`}
          title={`Qty to wrap (1–${allowed})`}
          placeholder='0'
          value={staged || ''}
          onChange={event => onAmount(event.target.value)}
        />
        {/* Auto fill copies what may be wrapped, and takes itself back. */}
        <Button
          variant='outline'
          disabled={!staged && !row.auto_fill_available}
          title={staged ? 'Clear' : `Auto fill — all ${allowed}`}
          onClick={() => onAmount(staged ? '' : String(Math.min(row.auto_fill_amount, allowed)))}
        >
          {staged ? 'Clear' : 'Auto fill'}
        </Button>
      </span>
    )

  // The pieces left are the ones a remake still owes: they are wrapped once it is Bent.
  const held = READY.includes(row.status ?? '') && allowed < row.left_to_wrap

  return (
    <span
      className='inline-flex items-center gap-1 text-xs text-muted-foreground'
      title={
        held ? 'Held until the machine marks the remanufacture Bent' : 'Needs Bent or Stock status'
      }
    >
      <Ban className='size-3.5' />
      {held ? 'Awaiting remanufacture' : 'Not eligible'}
    </span>
  )
}

type WrapLinesProps = {
  departmentId: number | undefined
  rows: WrappingRow[]
  remansOf: (row: WrappingRow) => Remanufacturing[]
  allowedOf: (row: WrappingRow) => number
  stagedOf: (row: WrappingRow) => number
  onAmount: (originItem: string, amount: string) => void
}

/** The order's lines: what is left on each, what is owed back, and what goes into this package. */
const WrapLines = ({
  departmentId,
  rows,
  remansOf,
  allowedOf,
  stagedOf,
  onAmount
}: WrapLinesProps) => {
  const [remaking, setRemaking] = useState<WrappingRow | null>(null)
  const [noteLine, setNoteLine] = useState<WrappingRow | null>(null)
  const noteState = useLineNoteState(rows.map(row => row.origin_item))
  const columns = useColumnOrder(WRAP_LINES_TABLE)

  return (
    <>
      <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
        <Table>
          <TableHeader>
            <TableRow>{columns.headers}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => {
              const lineRemans = remansOf(row)
              const allowed = allowedOf(row)

              return (
                <TableRow key={row.origin_item} data-reman={remanState(lineRemans)}>
                  {columns.cells({
                    line: (
                      <TableCell>
                        <span className='font-mono'>{row.origin_item}</span>
                      </TableCell>
                    ),
                    desc: (
                      <TableCell>
                        <span className='truncate text-muted-foreground'>
                          {row.description ?? '—'}
                        </span>
                      </TableCell>
                    ),
                    qty: (
                      <TableCell>
                        <span className='font-mono'>{row.qty_ordered}</span>
                      </TableCell>
                    ),
                    wrapped: (
                      <TableCell>
                        <span className='font-mono'>{row.wrapped}</span>
                      </TableCell>
                    ),
                    left: (
                      <TableCell>
                        <span className='font-mono'>{row.left_to_wrap}</span>
                      </TableCell>
                    ),
                    status: (
                      <TableCell>
                        <StatusPill status={itemStatus(row.status)} />
                      </TableCell>
                    ),
                    reman: (
                      <TableCell>
                        <RemanCell
                          row={row}
                          remans={lineRemans}
                          onRemake={() => setRemaking(row)}
                        />
                      </TableCell>
                    ),
                    wrapping: (
                      <TableCell>
                        <WrapCell
                          row={row}
                          allowed={allowed}
                          staged={stagedOf(row)}
                          onAmount={amount => onAmount(row.origin_item, amount)}
                        />
                      </TableCell>
                    ),
                    notes: (
                      <TableCell>
                        <NoteButton
                          state={noteState(row.origin_item)}
                          label={`Line notes for ${row.origin_item}`}
                          onClick={() => setNoteLine(row)}
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

      <RemanufactureDialog
        departmentId={departmentId}
        line={remaking}
        onOpenChange={open => !open && setRemaking(null)}
      />

      <LineNotesDialog
        originItem={noteLine?.origin_item ?? null}
        productId={noteLine?.description ?? ''}
        onOpenChange={open => !open && setNoteLine(null)}
      />
    </>
  )
}

type PackageWeightProps = {
  weight: string
  onWeight: (weight: string) => void
  /** The package would push the location it is going to past its limit. */
  over: boolean
  slot: LocationSlot | null
}

// Typed in: no line item says what its trims weigh, so the Worker reads the scale.
const PackageWeight = ({ weight, onWeight, over, slot }: PackageWeightProps) => (
  <span
    className={cn(
      'flex items-center gap-2 rounded-md px-1',
      over && 'bg-destructive/10 text-destructive'
    )}
  >
    <span className='text-xs tracking-wider text-muted-foreground uppercase'>Package weight</span>
    <Input
      className='w-24'
      type='number'
      min={0}
      inputMode='numeric'
      aria-label='Package weight'
      aria-invalid={over || undefined}
      placeholder='0'
      value={weight}
      onChange={event => onWeight(event.target.value)}
    />
    <span className='text-sm text-muted-foreground'>
      lb{slot?.max_weight ? ` / ${slot.remaining_weight ?? slot.max_weight}` : ''}
    </span>
  </span>
)

type CompleteOrderButtonProps = {
  departmentId: number | undefined
  order: string
  number: string
  owesReman: boolean
  onDone: () => void
}

/**
 * Order Complete: available once Left To Wrap is zero on every line and no remake is still out, and
 * asked about — the batch it sends to EBMS cannot be taken back.
 */
const CompleteOrderButton = ({
  departmentId,
  order,
  number,
  owesReman,
  onDone
}: CompleteOrderButtonProps) => {
  const [completing, setCompleting] = useState(false)
  const { data: completion } = useQuery(orderCompleteQuery(departmentId, order))
  const batch = (completion?.manufacturing_batch ?? []).reduce(
    (total, line) => total + line.manufactured,
    0
  )

  const complete = useCompleteOrder(() => {
    setCompleting(false)
    toast.add({
      type: 'success',
      title: `Order ${number} complete · C_MFG batch (${batch} pcs) pushed to EBMS`
    })
    onDone()
  })
  return (
    <>
      <Button
        className='ml-auto'
        disabled={!completion?.can_complete}
        title={
          completion?.can_complete
            ? undefined
            : owesReman
              ? 'Waiting on a remanufacture — available once the machine marks it Bent'
              : 'Available once Left To Wrap is zero on every line'
        }
        onClick={() => setCompleting(true)}
      >
        <Check data-icon='inline-start' />
        Order complete
      </Button>
      <ConfirmDialog
        open={completing}
        onOpenChange={setCompleting}
        title={`Complete order ${number}?`}
        description='Are you sure you are done with this order and that you want to create a manufacturing batch for it?'
        confirmLabel='Yes, Create Manufacturing Batch'
        cancelLabel='No'
        isPending={complete.isPending}
        onConfirm={() => departmentId && complete.mutate({ order, departmentId })}
      />
    </>
  )
}

type CreatePrintButtonProps = {
  departmentId: number | undefined
  order: string
  lines: { row: WrappingRow; quantity: number }[]
  target: { location_id: number; name: string | null } | null
  targetSlot: LocationSlot | null
  /** What the Worker typed, or `null` when he left it empty. */
  weight: number | null
  /** The package would push its location past the limit. */
  over: boolean
  onPrinted: () => void
}

/** Create & print: waits for a quantity and a location, and asks before it overloads one. */
const CreatePrintButton = ({
  departmentId,
  order,
  lines,
  target,
  targetSlot,
  weight,
  over,
  onPrinted
}: CreatePrintButtonProps) => {
  const [overLocation, setOverLocation] = useState(false)
  const createPackage = useCreatePackage(() => {
    setOverLocation(false)
    onPrinted()
  })
  const pieces = lines.reduce((total, line) => total + line.quantity, 0)

  const print = (override: boolean) =>
    departmentId &&
    target &&
    createPackage.mutate(
      {
        order,
        department_id: departmentId,
        location_id: target.location_id,
        lines: lines.map(line => ({ origin_item: line.row.origin_item, quantity: line.quantity })),
        ...(weight === null ? {} : { weight }),
        ...(override ? { override_weight: true } : {})
      },
      {
        onSuccess: created =>
          toast.add({
            type: 'success',
            title: `Printed label ${created.name ?? ''} · ${pieces} pcs → ${target.name ?? target.location_id}`
          })
      }
    )

  return (
    <>
      <Button
        disabled={!lines.length || !target || createPackage.isPending}
        onClick={() => (over ? setOverLocation(true) : print(false))}
      >
        <Printer data-icon='inline-start' />
        Create &amp; print
      </Button>

      {/* The weight limit is soft: the Worker can still print, and the server is told he chose to. */}
      <ConfirmDialog
        open={overLocation}
        onOpenChange={setOverLocation}
        title='Location over weight limit'
        description={`${target?.name ?? target?.location_id ?? 'This location'} would exceed ${targetSlot?.max_weight ?? 0} lb (soft limit). Print anyway?`}
        confirmLabel='Print anyway'
        cancelLabel='Cancel'
        isPending={createPackage.isPending}
        onConfirm={() => print(true)}
      />
    </>
  )
}

type BenchHeaderProps = { number: string; rows: WrappingRow[]; onBack: () => void }

const BenchHeader = ({ number, rows, onBack }: BenchHeaderProps) => {
  const ordered = rows.reduce((total, row) => total + row.qty_ordered, 0)
  const wrapped = rows.reduce((total, row) => total + row.wrapped, 0)

  return (
    <span className='flex items-center gap-3'>
      <Button variant='outline' onClick={onBack}>
        <ArrowLeft data-icon='inline-start' />
        Back to Wrapping
      </Button>
      <span className='font-mono font-medium'>{number}</span>
      {orderOverdue(rows) ? (
        <span className='rounded-md border border-destructive px-1.5 py-0.5 text-xs font-semibold tracking-wider text-destructive uppercase'>
          Overdue
        </span>
      ) : null}
      <span className='ml-auto font-mono text-sm text-muted-foreground'>
        {wrapped} / {ordered} wrapped
      </span>
    </span>
  )
}

type OrderFactsProps = {
  number: string
  priority: string | null
  locations: OrderLocation[]
  onRemove: (location: OrderLocation) => void
}

/**
 * The order's own facts, and the only place its Trim Location is said: it belongs to the order, not
 * to each package.
 */
const OrderFacts = ({ number, priority, locations, onRemove }: OrderFactsProps) => (
  <dl className='flex flex-wrap gap-x-8 gap-y-2 text-sm'>
    <div className='flex flex-col gap-0.5'>
      <dt className='text-xs tracking-wider text-muted-foreground uppercase'>Order #</dt>
      <dd className='font-mono'>{number}</dd>
    </div>
    <div className='flex flex-col gap-0.5'>
      <dt className='text-xs tracking-wider text-muted-foreground uppercase'>Priority</dt>
      <dd>{priority ?? '—'}</dd>
    </div>
    <div className='flex flex-col gap-0.5'>
      <dt className='text-xs tracking-wider text-muted-foreground uppercase'>Trim Location</dt>
      <dd className='flex flex-wrap gap-1.5'>
        <LocationChips locations={locations} onRemove={onRemove} />
      </dd>
    </div>
  </dl>
)

type WrapOrderProps = {
  departmentId: number | undefined
  /** Every released line of this one order, as the Wrapping list holds them. */
  rows: WrappingRow[]
  onBack: () => void
}

/**
 * One order at the wrapping bench and the three gates it walks: a quantity opens Select location, a
 * location opens Create & print, and only every line wrapped opens Order Complete.
 */
export const WrapOrder = ({ departmentId, rows, onBack }: WrapOrderProps) => {
  const order = rows[0]
  // The operator's scratch pad, cleared by printing rather than kept anywhere.
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [weight, setWeight] = useState('')
  const [picked, setPicked] = useState<LocationSlot | null>(null)
  const [picking, setPicking] = useState(false)
  const [removing, setRemoving] = useState<OrderLocation | null>(null)

  const { data: remans } = useQuery(remanufacturingsQuery)
  const { data: locations } = useQuery(orderLocationsQuery(order?.order ?? null))
  // This department's cells, for the weight already standing on the one the package is going to.
  const { data: slots } = useQuery(wrappingLocationsQuery(departmentId, true))

  const number = order?.order_number ?? order?.order ?? ''

  if (!order) return null

  const remansOf = (row: WrappingRow) => remans?.get(row.origin_item) ?? []
  // The pieces an open remake still holds are wrapped once it is Bent, not before.
  const allowedOf = (row: WrappingRow) => wrapAllowed(row, remansOf(row))
  const stagedOf = (row: WrappingRow) => stagedQuantity(amounts[row.origin_item], allowedOf(row))

  const lines = rows
    .filter(row => row.can_wrap)
    .map(row => ({ row, quantity: stagedOf(row) }))
    .filter(line => line.quantity > 0)

  const { target, slot: targetSlot } = packageTarget(picked, locations, slots)
  const packageWeight = Number(weight) || 0
  const overTarget = !!targetSlot && packageWeight > 0 && overWeight(targetSlot, packageWeight)

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <BenchHeader number={number} rows={rows} onBack={onBack} />

      <WrapLines
        departmentId={departmentId}
        rows={rows}
        remansOf={remansOf}
        allowedOf={allowedOf}
        stagedOf={stagedOf}
        onAmount={(originItem, amount) =>
          setAmounts(current => ({ ...current, [originItem]: amount }))
        }
      />

      <OrderFacts
        number={number}
        priority={order.priority}
        locations={locations ?? []}
        onRemove={setRemoving}
      />

      <div className='flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-xs'>
        <Button variant='outline' disabled={!lines.length} onClick={() => setPicking(true)}>
          <MapPin data-icon='inline-start' />
          Select location{target ? ` · ${target.name ?? target.location_id}` : ''}
        </Button>

        <CreatePrintButton
          departmentId={departmentId}
          order={order.order}
          lines={lines}
          target={target}
          targetSlot={targetSlot}
          weight={weight.trim() ? packageWeight : null}
          over={overTarget}
          onPrinted={() => {
            setAmounts({})
            setWeight('')
          }}
        />

        <PackageWeight weight={weight} onWeight={setWeight} over={overTarget} slot={targetSlot} />

        <CompleteOrderButton
          departmentId={departmentId}
          order={order.order}
          number={number}
          owesReman={rows.some(row => remanOwed(remansOf(row)) > 0)}
          onDone={onBack}
        />
      </div>

      <LocationDialog
        departmentId={departmentId}
        orderNumber={number}
        orderLocations={locations ?? []}
        stagedWeight={packageWeight}
        open={picking}
        onOpenChange={setPicking}
        onPick={setPicked}
        onRemove={setRemoving}
      />

      <RemoveLocationDialog
        order={order.order}
        locations={locations ?? []}
        location={removing}
        onOpenChange={open => !open && setRemoving(null)}
        // A location taken off is no longer somewhere the next package can go.
        onRemoved={gone => picked?.location_id === gone.location_id && setPicked(null)}
      />
    </div>
  )
}
