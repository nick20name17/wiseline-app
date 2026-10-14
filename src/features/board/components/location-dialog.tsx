import { useBoard, useViewOnly } from '../lib/board-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { inBoardOrder } from '@/lib/departments'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Timer, Warehouse } from 'lucide-react'
import { useState } from 'react'
import {
  departmentsQuery,
  locationTypesQuery,
  useRemoveJobLocation,
  useRemoveOrderLocation,
  wrappingLocationsQuery,
  type LocationSlot,
  type OrderLocation
} from '../api'
import { locationColumns, overWeight, type HeldLocation } from '../lib/wrapping'
import { ConfirmDialog } from '@/components/confirm-dialog'

// How an order's own location reads, in the picker and on its chips alike.
const TINT = {
  over: 'border-destructive/40 bg-destructive/10 text-destructive',
  locked: 'border-caution/40 bg-caution/15 text-caution',
  current: 'border-primary/40 bg-primary/10 text-primary'
}

/** Over weight outranks locked: a full cell is the more urgent thing to see. */
const tintOf = (over: boolean, locked: boolean | undefined) =>
  TINT[over ? 'over' : locked ? 'locked' : 'current']

const weightOf = (slot: LocationSlot) =>
  `${slot.used_weight}${slot.max_weight === null ? '' : `/${slot.max_weight}`} lb`

type LocationDialogProps<T extends HeldLocation> = {
  departmentId: number | undefined
  /** The order's autoid: a full cell it stands on already stays open to it. */
  order: string | null
  /** The order the package is for, as the floor reads it. */
  orderNumber: string
  /** Where the order already stands: its own cells are tinted, and clicking one removes it. */
  orderLocations: T[]
  /** What the package being built weighs, so a cell it would overload reads red before the print. */
  stagedWeight: number
  /** The locations are the job's (Trim), not its packages': a pick adds one to the job. */
  job?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (location: LocationSlot) => void
  /** Clicking one of the order's own cells takes it off; without this it is picked like any other. */
  onRemove?: (location: T) => void
}

/**
 * Select Location. Every location of the department is in view at once, a column per location type,
 * so the Worker scans for a free one rather than paging through types. A full location is shown and
 * shut rather than hidden — he is looking for a place he can see from the floor. A cell is coloured
 * by what putting *this* order there would mean: its current cell, its earlier (locked) ones, and any
 * the staged package would push over weight.
 */
export const LocationDialog = <T extends HeldLocation>({
  departmentId,
  order,
  orderNumber,
  orderLocations,
  stagedWeight,
  job = false,
  open,
  onOpenChange,
  onPick,
  onRemove
}: LocationDialogProps<T>) => {
  const board = useBoard()
  // Opens on this department's locations every time; another department's are one tab away.
  const [tab, setTab] = useState<number | null>(null)
  const shown = tab ?? departmentId
  const { data: departments } = useQuery(departmentsQuery)
  const { data: slots, isPending } = useQuery(wrappingLocationsQuery(shown, order, open))
  const { data: typeOf } = useQuery({ ...locationTypesQuery, enabled: open })
  const columns = locationColumns(slots ?? [], typeOf)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={next => !next && setTab(null)}
    >
      {/* Wide enough for several location types side by side; more scroll sideways. */}
      <DialogContent className='sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>Select location · Order {orderNumber}</DialogTitle>
          <DialogDescription>
            {job
              ? `Defaults to ${board.name} locations — click an available one to add it to this job; the job's other locations stay.`
              : `Defaults to ${board.name} locations — click an available one to put this package there. Adding a 2nd location oranges the earlier one.`}{' '}
            Multi-Order locations show an order count (e.g. 2/4) and accept several orders up to
            their cap or Max Weight; greyed ones are full or single-order and in use.
            {onRemove ? ' Click one of this order’s own locations to remove it.' : null}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={String(shown ?? '')} onValueChange={value => setTab(Number(value))}>
          {/* A phone swipes the departments it has no room for; the wrapper keeps the end tabs'
              focus rings clear of the scroll. */}
          <div className='overflow-x-auto max-md:scrollbar-none'>
            <TabsList variant='line'>
              {inBoardOrder(departments).map(department => (
                <TabsTrigger key={department.id} value={String(department.id)}>
                  {department.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {/* A phone's drawer scrolls as one, its columns stacked; a box scrolling inside it would
            fight the swipe. */}
        <div className='scrollport min-h-56 md:max-h-120 md:overflow-auto'>
          {isPending ? (
            <Skeleton className='h-56' />
          ) : columns.length ? (
            <div className='flex flex-col gap-4 md:flex-row md:gap-3'>
              {columns.map(column => (
                <section
                  key={column.key}
                  className='flex min-w-0 flex-col gap-1.5 md:flex-1 md:shrink-0 md:basis-44'
                >
                  {/* Stays over its rows while a long column scrolls. */}
                  <h3 className='sticky top-0 z-10 flex flex-col bg-popover pb-1'>
                    <span className='truncate text-xs font-semibold tracking-wider uppercase'>
                      {column.name}
                    </span>
                    {column.warehouse ? (
                      <span className='truncate text-xs text-muted-foreground'>
                        {column.warehouse}
                      </span>
                    ) : null}
                  </h3>
                  {column.slots.map(slot => {
                    const mine = orderLocations.find(spot => spot.location_id === slot.location_id)
                    const predictOver = stagedWeight > 0 && overWeight(slot, stagedWeight)
                    const over = overWeight(slot) || predictOver

                    return (
                      <button
                        key={slot.location_id}
                        type='button'
                        disabled={!mine && !slot.available}
                        title={`${slot.name ?? slot.location_id} · ${weightOf(slot)} · ${slot.orders_on_it}/${slot.max_orders ?? 1}${slot.multi_order ? ' orders (Multi-Order)' : ' order'}${mine && onRemove ? ' · click to remove it from this order' : ''}`}
                        className={cn(
                          'flex items-baseline justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-sm leading-tight hover:border-input disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground',
                          mine
                            ? tintOf(over, mine.orange)
                            : slot.available && predictOver
                              ? TINT.over
                              : undefined
                        )}
                        onClick={() => {
                          onOpenChange(false)
                          if (mine && onRemove) onRemove(mine)
                          else onPick(slot)
                        }}
                      >
                        <span className='truncate font-mono font-medium'>
                          {slot.name ?? slot.location_id}
                        </span>
                        <span className='shrink-0 text-xs opacity-75'>
                          {slot.multi_order
                            ? `${slot.orders_on_it}/${slot.max_orders ?? '∞'} · `
                            : null}
                          {weightOf(slot)}
                        </span>
                      </button>
                    )
                  })}
                </section>
              ))}
            </div>
          ) : (
            <Empty className='min-h-56'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Warehouse />
                </EmptyMedia>
                <EmptyTitle>No locations</EmptyTitle>
                <EmptyDescription>
                  Locations are set up in Settings, under the department they belong to.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        <DialogFooter className='sm:justify-start'>
          <p className='flex items-start gap-2 text-xs text-muted-foreground'>
            <Timer className='mt-px size-3.5 shrink-0' />
            <span>
              A location also frees on its own — automatically about{' '}
              <b className='text-foreground'>15 min</b> after Shipping scans the last package for
              this order onto a truck.
            </span>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type LocationChipsProps<T extends HeldLocation> = {
  locations: T[]
  /** None where the locations are only read, as at the machine. */
  onRemove?: (location: T) => void
}

/** The locations an order stands on, each a chip that asks to take it off. */
export const LocationChips = <T extends HeldLocation>({
  locations,
  onRemove
}: LocationChipsProps<T>) => {
  const viewOnly = useViewOnly()
  if (!locations.length)
    return <span className='text-xs text-muted-foreground'>No location assigned</span>

  return locations.map(spot => {
    const over = !!spot.over || (spot.remaining_weight != null && spot.remaining_weight < 0)

    if (viewOnly || !onRemove)
      return (
        <span
          key={spot.location_id}
          className={cn(
            'rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium',
            tintOf(over, spot.orange)
          )}
        >
          {spot.name ?? spot.location_id}
        </span>
      )

    return (
      <button
        key={spot.location_id}
        type='button'
        aria-label={`Take ${spot.name ?? spot.location_id} off this order`}
        title={
          spot.orange
            ? 'Locked — full, do not add more packages here'
            : 'Click to remove this location'
        }
        // On a phone a finger hits around the chip.
        className={cn(
          'relative rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium hover:brightness-95 max-md:after:absolute max-md:after:-inset-y-2.5',
          tintOf(over, spot.orange)
        )}
        onClick={() => onRemove(spot)}
      >
        {spot.name ?? spot.location_id}
      </button>
    )
  })
}

type RemoveLocationDialogProps = {
  order: string
  /** Every location the order stands on — the last one cannot go while the order has packages. */
  locations: OrderLocation[]
  /** Counted on the order, not its locations: taking one off can leave its packages on none. */
  hasPackages: boolean
  /** The one being taken off, or `null` when nothing is being asked. */
  location: OrderLocation | null
  onOpenChange: (open: boolean) => void
  onRemoved?: (location: OrderLocation) => void
  /** Taking the last location off means choosing where every package goes instead. */
  onReplace: () => void
}

/**
 * Taking a location off an order is asked about. An order with packages must keep at least one: the
 * packages are physically somewhere, and the app has to be able to say where. So removing the last
 * one turns into choosing a new one, which all the packages move to (p1 (950,475)).
 */
export const RemoveLocationDialog = ({
  order,
  locations,
  hasPackages,
  location: current,
  onOpenChange,
  onRemoved,
  onReplace
}: RemoveLocationDialogProps) => {
  const [location, release] = useRetained(current)
  const remove = useRemoveOrderLocation()
  const code = location?.name ?? String(location?.location_id ?? '')
  const blocked = locations.length <= 1 && hasPackages

  if (blocked)
    return (
      <ConfirmDialog
        open={!!current}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={release}
        title='Location required'
        description='An order with existing packages needs to have at least 1 location, please select a location to continue.'
        confirmLabel='Select new location'
        cancelLabel='Cancel'
        onConfirm={() => {
          onOpenChange(false)
          onReplace()
        }}
      />
    )

  return (
    <ConfirmDialog
      open={!!current}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={release}
      title='Remove location'
      description='Are you sure you want to remove this location from this order?'
      confirmLabel='Yes'
      destructive
      cancelLabel='No'
      isPending={remove.isPending}
      onConfirm={() =>
        location &&
        remove.mutate(
          { order, locationId: location.location_id },
          {
            onSuccess: () => {
              onRemoved?.(location)
              onOpenChange(false)
              toast.add({ type: 'success', title: `Location ${code} removed` })
            }
          }
        )
      }
    />
  )
}

type RemoveJobLocationDialogProps = {
  order: string
  departmentId: number | undefined
  /** The one being taken off, or `null` when nothing is being asked. */
  location: HeldLocation | null
  onOpenChange: (open: boolean) => void
}

/**
 * Taking one location off a job. Unlike a package's, a job may be left on none: its packages carry
 * no location of their own to lose track of.
 */
export const RemoveJobLocationDialog = ({
  order,
  departmentId,
  location: current,
  onOpenChange
}: RemoveJobLocationDialogProps) => {
  const [location, release] = useRetained(current)
  const remove = useRemoveJobLocation()
  const code = location?.name ?? String(location?.location_id ?? '')

  return (
    <ConfirmDialog
      open={!!current}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={release}
      title='Remove location'
      description={`Are you sure you want to remove ${code} from this job? Its other locations stay.`}
      confirmLabel='Yes'
      destructive
      cancelLabel='No'
      isPending={remove.isPending}
      onConfirm={() =>
        location &&
        departmentId !== undefined &&
        remove.mutate(
          { order, departmentId, locationId: location.location_id },
          {
            onSuccess: () => {
              onOpenChange(false)
              toast.add({ type: 'success', title: `Location ${code} removed` })
            }
          }
        )
      }
    />
  )
}
