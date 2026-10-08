import { useBoard, useViewOnly } from '../lib/board-context'
import { formatDate } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ArrowLeft, Ban, Check, MapPin, PackageSearch, Printer, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import {
  orderCompleteQuery,
  orderLocationsQuery,
  remanufacturingsQuery,
  useCompleteOrder,
  useCreatePackage,
  useFillInCoil,
  useMoveOrderPackages,
  useBoardDepartment,
  useUpdateLineItem,
  wrappingLocationsQuery,
  type LocationSlot,
  type OrderLocation,
  type Remanufacturing,
  type UnitCoil,
  type WrappingRow
} from '../api'
import { itemStatus } from '../lib/status'
import {
  benchLocations,
  orderOverdue,
  overPackageLimit,
  overWeight,
  packageTarget,
  packageWeight,
  remakeRoom,
  remanOwed,
  remanState,
  stagedQuantity,
  wrapAllowed,
  lineName,
  type CellRoom,
  type ShownLocation
} from '../lib/wrapping'
import { CoilAssignDialog } from './coil-assign-dialog'
import { CoilCell, type CoilItem, type CopiedCoil } from './coil-cell'
import { ConfirmDialog } from './confirm-dialog'
import { Figure } from './figure'
import { KeypadDialog } from './keypad-dialog'
import { LineNotesDialog } from './line-notes-dialog'
import { LocationChips, LocationDialog, RemoveLocationDialog } from './location-dialog'
import { usePackageLabel } from './use-package-label'
import { NoteButton } from '@/components/note-button'
import { PackagesDialog } from './packages-dialog'
import { RemanBadge, RemanNotApplicable } from './reman-badge'
import { RemanufactureDialog } from './remanufacture-dialog'
import { StatusPill } from './status-pill'
import { useLineNoteState } from './use-line-note-state'

// The statuses a line is wrapped from: the floor has finished it, or it came off the shelf.
const READY = ['bent', 'rolled', 'stock', 'bypassed']

type RemanCellProps = {
  row: WrappingRow
  remans: Remanufacturing[]
  onRemake: () => void
}

/**
 * The cell shows what is outstanding and keeps offering the request beside it: a remake can be spoiled
 * too, and asked for again.
 */
const RemanCell = ({ row, remans, onRemake }: RemanCellProps) => {
  const viewOnly = useViewOnly()
  if (row.is_bypassed) return <RemanNotApplicable />

  const room = remakeRoom(row.qty_ordered, remans)
  const made = row.status === 'bent' || row.status === 'wrapped'
  const again = remans.length ? 'Remanufacture again' : 'Remanufacture'

  return (
    <span className='flex items-center gap-1'>
      {remans.length ? <RemanBadge remans={remans} /> : null}
      {viewOnly ? (
        remans.length ? null : (
          <span className='text-muted-foreground'>—</span>
        )
      ) : made ? (
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={`Remanufacture ${lineName(row)}`}
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
  /** Another Product ID is going into this package, so Auto Fill here is shut p2 (963,410). */
  otherProduct: boolean
  onAmount: (amount: string) => void
}

const WrapCell = ({ row, allowed, staged, otherProduct, onAmount }: WrapCellProps) => {
  const { pack } = useBoard()
  const viewOnly = useViewOnly()
  if (row.status === pack.done)
    return <span className='text-xs text-muted-foreground'>{pack.doneLabel} ✓</span>
  // A Stock line stays Stock once all of it is packed p2 (941,521), so the figures say it is done.
  if (row.wrapped > 0 && row.left_to_wrap <= 0)
    return <span className='text-xs text-muted-foreground'>Packed ✓</span>

  if (viewOnly) return <span className='text-muted-foreground'>—</span>

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
          aria-label={`${pack.verb} from ${lineName(row)}`}
          title={`Qty to ${pack.verb.toLowerCase()} (1–${allowed})`}
          placeholder='0'
          value={staged || ''}
          onChange={event => onAmount(event.target.value)}
        />
        {/* Auto fill copies what may be wrapped, and takes itself back. */}
        <Button
          variant='outline'
          disabled={!staged && (!row.auto_fill_available || otherProduct)}
          title={
            staged
              ? 'Clear'
              : otherProduct
                ? 'Another Product ID is in this package'
                : `Auto fill — all ${allowed}`
          }
          onClick={() => onAmount(staged ? '' : String(Math.min(row.auto_fill_amount, allowed)))}
        >
          {staged ? 'Clear' : 'Auto fill'}
        </Button>
      </span>
    )

  if (row.coil_missing)
    return (
      <span
        className='inline-flex items-center gap-1 text-xs text-muted-foreground'
        title='Needs a Supplier and Coil Number before it is packaged'
      >
        <Ban className='size-3.5' />
        No coil yet
      </span>
    )

  // The pieces left are the ones a remake still owes: they are wrapped once it is Bent.
  const held = READY.includes(row.status ?? '') && allowed < row.left_to_wrap

  return (
    <span
      className='inline-flex items-center gap-1 text-xs text-muted-foreground'
      title={
        held
          ? 'Held until the machine marks the remanufacture Bent'
          : pack.ready
            ? `Needs ${pack.ready} or Stock status`
            : 'Cannot be packaged'
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
  coils?: ReadonlyMap<string, CoilItem>
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
  coils,
  onAmount
}: WrapLinesProps) => {
  const [remaking, setRemaking] = useState<WrappingRow | null>(null)
  const [noteLine, setNoteLine] = useState<WrappingRow | null>(null)
  const [stocking, setStocking] = useState<WrappingRow | null>(null)
  const [filling, setFilling] = useState<{
    row: WrappingRow
    units: UnitCoil[] | null
  } | null>(null)
  // The Coil Number copied off one line, to paste into the others p2 (1040,347).
  const [copied, setCopied] = useState<CopiedCoil | null>(null)
  const fillIn = useFillInCoil()
  const noteState = useLineNoteState(rows.map(row => row.origin_item))
  const board = useBoard()
  const viewOnly = useViewOnly()
  const updateLine = useUpdateLineItem({ released: true })
  const columns = useColumnOrder(board.tables.packLines)
  // Rollforming packs one Product ID at a time: the first line put in sets it p2 (963,410).
  const stagedProduct = board.coils ? rows.find(row => stagedOf(row) > 0)?.product_id : undefined

  return (
    <>
      <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
        {/* Description keeps room of its own; a narrower screen scrolls rather than squeezing it. */}
        <Table className='min-w-300 table-fixed'>
          <colgroup>{columns.cols}</colgroup>
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
                        <span className='font-mono'>{lineName(row)}</span>
                      </TableCell>
                    ),
                    desc: (
                      <TableCell>
                        <span className='truncate text-muted-foreground'>
                          {row.description ?? '—'}
                        </span>
                      </TableCell>
                    ),
                    // Anything but the standard 120" is worth a second look, as on the
                    // cutlists p1 (465,337) — on a board that has a standard length.
                    length: (
                      <TableCell>
                        <span
                          className={cn(
                            'font-mono',
                            board.standardLength !== null &&
                              row.length !== null &&
                              !row.is_standard_length &&
                              'text-destructive'
                          )}
                        >
                          {row.length === null ? '—' : `${row.length}"`}
                        </span>
                      </TableCell>
                    ),
                    qty: (
                      <TableCell>
                        <span className='font-mono'>{row.qty_ordered}</span>
                      </TableCell>
                    ),
                    // A worker who damages a piece at the bench takes a good one off the shelf here
                    // p1 (905,600), on a keypad p1 (918,616). A stock order puts trims on the shelf,
                    // so its lines take none off it.
                    stock: (
                      <TableCell>
                        {/* A line with no app row has nothing for the keypad to write to. */}
                        {board.stockCards && !viewOnly && !row.is_stock && row.item_id !== null ? (
                          <Button
                            variant='link'
                            aria-label={`Stock for ${lineName(row)}`}
                            title='Pull from stock'
                            onClick={() => setStocking(row)}
                          >
                            <Figure value={row.from_stock || null} />
                          </Button>
                        ) : (
                          <Figure value={row.from_stock || null} />
                        )}
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
                    coil: (
                      <TableCell>
                        <CoilCell
                          row={row}
                          item={coils?.get(row.origin_item)}
                          copied={copied}
                          pasting={fillIn.isPending}
                          onFill={units => setFilling({ row, units })}
                          onCopy={setCopied}
                          onPaste={entries => fillIn.mutate(entries)}
                        />
                      </TableCell>
                    ),
                    wrapping: (
                      <TableCell>
                        <WrapCell
                          row={row}
                          allowed={allowed}
                          staged={stagedOf(row)}
                          otherProduct={
                            stagedProduct !== undefined && row.product_id !== stagedProduct
                          }
                          onAmount={amount => onAmount(row.origin_item, amount)}
                        />
                      </TableCell>
                    ),
                    notes: (
                      <TableCell>
                        <NoteButton
                          state={noteState(row.origin_item)}
                          label={`Line notes for ${lineName(row)}`}
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

      <CoilAssignDialog
        lines={filling ? [{ id: filling.row.origin_item, id_inven: filling.row.product_id }] : []}
        action='fill'
        departmentId={departmentId}
        current={filling ? coils?.get(filling.row.origin_item) : undefined}
        units={{ fill: filling?.units ?? null }}
        open={!!filling}
        onOpenChange={open => !open && setFilling(null)}
        onAssigned={() => setFilling(null)}
      />

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

      {/* The line's whole figure, «anything from zero up to the Qty Ordered» p1 (904,624); the
          server moves Left To Wrap and what is left to manufacture with it. */}
      <KeypadDialog
        target={
          stocking
            ? {
                title: `Stock for ${lineName(stocking)}`,
                current: stocking.from_stock,
                max: stocking.qty_ordered
              }
            : null
        }
        isPending={updateLine.isPending}
        onOpenChange={open => !open && setStocking(null)}
        onEnter={value =>
          stocking?.item_id != null &&
          updateLine.mutate(
            { itemId: stocking.item_id, edit: { pull_from_stock: value } },
            { onSuccess: () => setStocking(null) }
          )
        }
      />
    </>
  )
}

type PackageWeightProps = {
  /** `null` when nothing is staged or some staged line does not say what it weighs. */
  weight: number | null
  /** The department's Max Weight per package; `null` is no ceiling. */
  limit: number | null
  /** Over the Max Weight per package p1 (940,365). */
  overPackage: boolean
  /** The package would push the location it is going to past its own Max Weight. */
  overLocation: boolean
  slot: CellRoom | null
}

/**
 * «The combined weight of the trims you are planning to wrap» p1 (912,358): worked out from the staged
 * lines rather than typed, so the floor has nothing to weigh.
 */
const PackageWeight = ({ weight, limit, overPackage, overLocation, slot }: PackageWeightProps) => (
  <span className='flex items-center gap-2'>
    <span className='text-xs tracking-wider text-muted-foreground uppercase'>Package weight</span>
    <output
      aria-label='Package weight'
      className={cn(
        'flex h-8 min-w-24 items-center rounded-md border border-input px-2.5 font-mono text-sm',
        overPackage && 'border-destructive bg-destructive/10 text-destructive'
      )}
      title={weight === null ? 'Not every staged line says what its pieces weigh' : undefined}
    >
      {weight === null ? '—' : weight}
    </output>
    <span className='text-sm text-muted-foreground'>
      lb{limit === null ? '' : ` · max ${limit} per package`}
    </span>
    {slot?.max_weight ? (
      <LocationRoom slot={slot} max={slot.max_weight} over={overLocation} />
    ) : null}
  </span>
)

/** What the location still holds, or by how much it is already past its limit. */
const LocationRoom = ({ slot, max, over }: { slot: CellRoom; max: number; over: boolean }) => {
  const room = slot.remaining_weight ?? max
  const name = slot.name ?? slot.location_id
  return (
    <span className={cn('text-sm text-muted-foreground', (over || room < 0) && 'text-destructive')}>
      {room < 0 ? `${-room} lb over on ${name}` : `${room} lb left on ${name}`}
    </span>
  )
}

type CompleteOrderButtonProps = {
  departmentId: number | undefined
  order: string
  number: string
  owesReman: boolean
  onDone: () => void
}

/**
 * Order Complete: available once Left To Wrap is zero on every line and no remake is still out — on
 * Accessories once the first package is made p3 (1265,296) — and asked about: the batch it sends to
 * EBMS cannot be taken back. Accessories' batch is what was packed, not what was ordered.
 */
const CompleteOrderButton = ({
  departmentId,
  order,
  number,
  owesReman,
  onDone
}: CompleteOrderButtonProps) => {
  const [completing, setCompleting] = useState(false)
  const { makes } = useBoard()
  const { data: completion } = useQuery(orderCompleteQuery(departmentId, order))
  const batch = (completion?.manufacturing_batch ?? []).reduce(
    (total, line) => total + line.manufactured,
    0
  )
  // Completing early leaves lines short; EBMS hears only of what went into packages.
  const short = completion?.outstanding.length ?? 0

  const complete = useCompleteOrder(() => {
    setCompleting(false)
    toast.add({
      type: 'success',
      title: batch
        ? `Order ${number} complete · C_MFG batch (${batch} pcs) pushed to EBMS`
        : `Order ${number} complete`
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
            : completion?.reason
              ? completion.reason
              : owesReman
                ? 'Waiting on a remanufacture — available once the machine marks it Bent'
                : makes
                  ? 'Available once Left To Wrap is zero on every line'
                  : 'Available once the first package is created'
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
        description={[
          batch
            ? `Are you sure you are done with this order and that you want to create a manufacturing batch for it (${batch} pcs)?`
            : `Are you sure you are done with this order? It leaves ${makes ? 'Wrapping' : 'Packaging'} for Completed Orders.`,
          short
            ? `${short} line${short === 1 ? ' is' : 's are'} not fully packed; only what is in the packages goes to EBMS.`
            : null
        ]
          .filter(Boolean)
          .join(' ')}
        confirmLabel={batch ? 'Yes, Create Manufacturing Batch' : 'Yes, Complete Order'}
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
  /** The order number the label prints; `order` is the autoid the server takes. */
  number: string
  lines: { row: WrappingRow; quantity: number }[]
  target: { location_id: number; name: string | null } | null
  /** Packed at the machine, with no location: Wrapping gives it one later p2 (1020,440). */
  atMachine: boolean
  /** `null` when a staged line does not say what it weighs; then no weight is sent. */
  weight: number | null
  overPackage: boolean
  overLocation: boolean
  onPrinted: () => void
}

/**
 * Create & print: waits for a quantity and a location, and asks before a package goes over the Max
 * Weight per package p1 (940,365) or overloads its location p1 (846,414) — one question for both.
 */
const CreatePrintButton = ({
  departmentId,
  order,
  number,
  lines,
  target,
  atMachine,
  weight,
  overPackage,
  overLocation,
  onPrinted
}: CreatePrintButtonProps) => {
  const [confirming, setConfirming] = useState(false)
  const label = usePackageLabel()
  const createPackage = useCreatePackage(() => {
    setConfirming(false)
    onPrinted()
  })
  // The board's own questions p1 (951,365) and p1 (861,440); both at once reads as one.
  const question = overPackage
    ? overLocation
      ? 'The package you are trying to create is over the weight limit, and with it the location will be over the weight limit too, are you sure you want to continue?'
      : 'The package you are trying to create is over the weight limit, are you sure you want to continue?'
    : 'With this package the location will be over the weight limit, are you sure you want to continue?'
  const pieces = lines.reduce((total, line) => total + line.quantity, 0)

  const print = (override: boolean) =>
    departmentId &&
    (target || atMachine) &&
    createPackage.mutate(
      {
        order,
        department_id: departmentId,
        ...(target ? { location_id: target.location_id } : {}),
        lines: lines.map(line => ({ origin_item: line.row.origin_item, quantity: line.quantity })),
        ...(weight === null ? {} : { weight }),
        ...(override ? { override_weight: true } : {})
      },
      {
        onSuccess: created => {
          toast.add({
            type: 'success',
            title: `Created ${created.name ?? 'the package'} · ${pieces} pcs${target ? ` → ${target.name ?? target.location_id}` : ''}`
          })
          if (!created.name)
            return toast.add({
              type: 'error',
              title: 'The package has no barcode yet',
              description: 'Print its label from See packages once it has one.'
            })
          label.print({
            name: created.name,
            orderNumber: number,
            location: target?.name ?? null,
            weight,
            contents: lines.map(line => ({
              product: lineName(line.row),
              quantity: line.quantity
            }))
          })
        }
      }
    )

  return (
    <>
      <Button
        disabled={!lines.length || (!target && !atMachine) || createPackage.isPending}
        onClick={() => (overPackage || overLocation ? setConfirming(true) : print(false))}
      >
        <Printer data-icon='inline-start' />
        Create &amp; print
      </Button>

      {/* Both limits are soft: the Worker can still print, and the server is told he chose to. */}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={
          overPackage && overLocation
            ? 'Package and location over weight limit'
            : overPackage
              ? 'Package over weight limit'
              : 'Location over weight limit'
        }
        description={question}
        confirmLabel='Yes, Create & Print'
        cancelLabel='No'
        isPending={createPackage.isPending}
        onConfirm={() => print(true)}
      />
      {label.sheet}
    </>
  )
}

type BenchHeaderProps = { number: string; rows: WrappingRow[]; onBack: () => void }

export const BenchHeader = ({ number, rows, onBack }: BenchHeaderProps) => {
  const { pack } = useBoard()
  const ordered = rows.reduce((total, row) => total + row.qty_ordered, 0)
  const wrapped = rows.reduce((total, row) => total + row.wrapped, 0)

  return (
    <span className='flex items-center gap-3'>
      <Button variant='outline' onClick={onBack}>
        <ArrowLeft data-icon='inline-start' />
        Back to {pack.station}
      </Button>
      <span className='font-mono font-medium'>{number}</span>
      {orderOverdue(rows) ? (
        <span className='rounded-md border border-destructive px-1.5 py-0.5 text-xs font-semibold tracking-wider text-destructive uppercase'>
          Overdue
        </span>
      ) : null}
      <span className='ml-auto font-mono text-sm text-muted-foreground'>
        {wrapped} / {ordered} {pack.done}
      </span>
    </span>
  )
}

type OrderFactsProps = {
  number: string
  /** Any of the order's rows: the order info rides on every one. */
  order: WrappingRow
  locations: ShownLocation[]
  onRemove?: (location: OrderLocation) => void
}

const Fact = ({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) => (
  <div className='flex flex-col gap-0.5'>
    <dt className='text-xs tracking-wider text-muted-foreground uppercase'>{label}</dt>
    <dd className={cn(mono && 'font-mono')}>{value ?? '—'}</dd>
  </div>
)

/**
 * The order's own facts p1 (885,283), (885,389), and the only place its Trim Location is said: it
 * belongs to the order, not to each package.
 */
const OrderFacts = ({ number, order, locations, onRemove }: OrderFactsProps) => {
  const board = useBoard()
  return (
    <dl className='flex flex-wrap gap-x-8 gap-y-2 text-sm'>
      <Fact label='Order #' value={number} mono />
      <Fact label='Priority' value={order.priority} />
      {/* A stock order has no customer behind it, so none of the EBMS order info. */}
      {order.is_stock ? null : (
        <>
          <Fact label='PO' value={order.po} mono />
          <Fact label='Salesman' value={order.salesman} />
          <Fact label='Ship Via' value={order.ship_via} />
          <Fact label='Ship Date' value={order.ship_date && formatDate(order.ship_date)} />
        </>
      )}
      <div className='flex flex-col gap-0.5'>
        <dt className='text-xs tracking-wider text-muted-foreground uppercase'>
          {board.name} Location
        </dt>
        <dd className='flex flex-wrap gap-1.5'>
          <LocationChips locations={locations} onRemove={onRemove} />
        </dd>
      </div>
    </dl>
  )
}

type WrapOrderProps = {
  departmentId: number | undefined
  /** Every released line of this one order, as the Wrapping list holds them. */
  rows: WrappingRow[]
  /** At the machine: each line's coil, which the Worker fills in where the Manager left it Undefined. */
  coils?: ReadonlyMap<string, CoilItem>
  onBack: () => void
}

/**
 * One order at the wrapping bench and the three gates it walks: a quantity opens Select location, a
 * location opens Create & print, and only every line wrapped opens Order Complete.
 */
export const WrapOrder = ({ departmentId, rows, coils, onBack }: WrapOrderProps) => {
  const order = rows[0]
  const board = useBoard()
  const atMachine = board.packsAtMachine
  // The operator's scratch pad, cleared by printing rather than kept anywhere.
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [picked, setPicked] = useState<LocationSlot | null>(null)
  // Select Location either aims the next package, or — when the last location is taken off — moves
  // every package already made.
  const [picking, setPicking] = useState<'package' | 'replace' | null>(null)
  const [removing, setRemoving] = useState<OrderLocation | null>(null)
  const [seeing, setSeeing] = useState(false)

  const { data: remans } = useQuery(remanufacturingsQuery(departmentId))
  const { data: department } = useBoardDepartment(board.code)
  const { data: locations } = useQuery(orderLocationsQuery(order?.order ?? null))
  // This department's cells, for the weight already standing on the one the package is going to.
  const { data: slots } = useQuery(
    wrappingLocationsQuery(departmentId, order?.order ?? null, !!order)
  )
  const move = useMoveOrderPackages()
  const viewOnly = useViewOnly()

  if (!order) return null

  const number = order.order_number ?? order.order
  const hasPackages = rows.some(row => row.wrapped > 0)

  const remansOf = (row: WrappingRow) => remans?.get(row.origin_item) ?? []
  // The pieces an open remake still holds are wrapped once it is Bent, not before.
  const allowedOf = (row: WrappingRow) => wrapAllowed(row, remansOf(row))
  const stagedOf = (row: WrappingRow) => stagedQuantity(amounts[row.origin_item], allowedOf(row))

  const lines = rows
    .filter(row => row.can_wrap)
    .map(row => ({ row, quantity: stagedOf(row) }))
    .filter(line => line.quantity > 0)

  // At the machine a package is made with no location, whatever the order already stands on.
  const { target, slot: targetSlot } = atMachine
    ? { target: null, slot: null }
    : packageTarget(picked, locations, slots)
  const weight = lines.length ? packageWeight(lines) : null
  const limit = department?.max_package_weight ?? null
  const overPackage = overPackageLimit(weight, limit)
  const overTarget = !!targetSlot && !!weight && overWeight(targetSlot, weight)
  const { shown: shownLocations, pendingId } = benchLocations(
    locations,
    picked,
    overTarget ? (target?.location_id ?? null) : null
  )
  // Nothing to take off the server for a location no package has gone to yet.
  const removeLocation = (spot: OrderLocation) =>
    spot.location_id === pendingId ? setPicked(null) : setRemoving(spot)

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <BenchHeader number={number} rows={rows} onBack={onBack} />

      <WrapLines
        departmentId={departmentId}
        rows={rows}
        remansOf={remansOf}
        allowedOf={allowedOf}
        stagedOf={stagedOf}
        coils={coils}
        onAmount={(originItem, amount) =>
          setAmounts(current => ({ ...current, [originItem]: amount }))
        }
      />

      <OrderFacts
        number={number}
        order={order}
        locations={shownLocations}
        onRemove={atMachine ? undefined : removeLocation}
      />

      <div className='flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-xs'>
        {viewOnly ? null : (
          <>
            {atMachine ? null : (
              <Button
                variant='outline'
                disabled={!lines.length}
                onClick={() => setPicking('package')}
              >
                <MapPin data-icon='inline-start' />
                Select location{target ? ` · ${target.name ?? target.location_id}` : ''}
              </Button>
            )}

            <CreatePrintButton
              departmentId={departmentId}
              order={order.order}
              number={number}
              lines={lines}
              target={target}
              atMachine={atMachine}
              weight={weight}
              overPackage={overPackage}
              overLocation={overTarget}
              onPrinted={() => setAmounts({})}
            />

            <PackageWeight
              weight={weight}
              limit={limit}
              overPackage={overPackage}
              overLocation={overTarget}
              slot={targetSlot}
            />
          </>
        )}

        {/* p1 (911,425): there is something to see once the first package exists. */}
        <Button variant='outline' disabled={!hasPackages} onClick={() => setSeeing(true)}>
          <PackageSearch data-icon='inline-start' />
          See packages
        </Button>

        {/* At the machine the order completes itself once Wrapping locates its last package. */}
        {viewOnly || atMachine ? null : (
          <CompleteOrderButton
            departmentId={departmentId}
            order={order.order}
            number={number}
            owesReman={rows.some(row => remanOwed(remansOf(row)) > 0)}
            onDone={onBack}
          />
        )}
      </div>

      <LocationDialog
        departmentId={departmentId}
        order={order.order}
        orderNumber={number}
        orderLocations={shownLocations}
        stagedWeight={weight ?? 0}
        open={!!picking}
        onOpenChange={open => !open && setPicking(null)}
        onPick={slot =>
          picking === 'replace'
            ? move.mutate(
                { order: order.order, locationId: slot.location_id },
                {
                  onSuccess: () => {
                    setPicked(null)
                    toast.add({
                      type: 'success',
                      title: `Moved to ${slot.name ?? slot.location_id}`
                    })
                  }
                }
              )
            : setPicked(slot)
        }
        onRemove={removeLocation}
      />

      <PackagesDialog
        order={order.order}
        number={number}
        rows={rows}
        open={seeing}
        onOpenChange={setSeeing}
      />

      <RemoveLocationDialog
        order={order.order}
        locations={locations ?? []}
        hasPackages={hasPackages}
        location={removing}
        onOpenChange={open => !open && setRemoving(null)}
        // A location taken off is no longer somewhere the next package can go.
        onRemoved={gone => picked?.location_id === gone.location_id && setPicked(null)}
        // Replacing the last location picks where every package goes, so a pending pick is dropped:
        // left in, its cell would read as the order's own and clicking it would remove, not move.
        onReplace={() => {
          setPicked(null)
          setPicking('replace')
        }}
      />
    </div>
  )
}
