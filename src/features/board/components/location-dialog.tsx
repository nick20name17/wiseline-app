import { useBoard } from '../lib/board-context'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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
  useRemoveOrderLocation,
  wrappingLocationsQuery,
  type LocationSlot,
  type OrderLocation
} from '../api'
import { defaultWarehouseOf, overWeight, warehousesOf, type ShownLocation } from '../lib/wrapping'
import { ConfirmDialog } from './confirm-dialog'

// How an order's own location reads, in the picker and on its chips alike.
const TINT = {
  over: 'border-destructive/40 bg-destructive/10 text-destructive',
  locked: 'border-caution/40 bg-caution/15 text-caution',
  current: 'border-primary/40 bg-primary/10 text-primary'
}

/** Over weight outranks locked: a full cell is the more urgent thing to see. */
const tintOf = (over: boolean, locked: boolean) =>
  TINT[over ? 'over' : locked ? 'locked' : 'current']

type LocationDialogProps = {
  departmentId: number | undefined
  /** The order's autoid: a full cell it stands on already stays open to it. */
  order: string | null
  /** The order the package is for, as the floor reads it. */
  orderNumber: string
  /** Where the order already stands: its own cells are tinted, and clicking one removes it. */
  orderLocations: OrderLocation[]
  /** What the package being built weighs, so a cell it would overload reads red before the print. */
  stagedWeight: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (location: LocationSlot) => void
  onRemove: (location: OrderLocation) => void
}

/**
 * Select Location: where the package about to be made will stand. A full location is shown and shut
 * rather than hidden — the Worker is looking for a place he can see from the floor. A cell is coloured
 * by what putting *this* order there would mean: its current cell, its earlier (locked) ones, and any
 * the staged package would push over weight.
 */
export const LocationDialog = ({
  departmentId,
  order,
  orderNumber,
  orderLocations,
  stagedWeight,
  open,
  onOpenChange,
  onPick,
  onRemove
}: LocationDialogProps) => {
  const board = useBoard()
  // Opens on this department's locations every time; another department's are one tab away.
  const [tab, setTab] = useState<number | null>(null)
  const [warehouse, setWarehouse] = useState<string | null>(null)
  const shown = tab ?? departmentId
  const { data: departments } = useQuery(departmentsQuery)
  const { data: slots, isPending } = useQuery(wrappingLocationsQuery(shown, order, open))
  const defaultName = defaultWarehouseOf(slots ?? [])
  // A department's locations can stand in several warehouses; the default one opens first.
  const warehouses = warehousesOf(slots ?? [], defaultName)
  // An order already standing somewhere opens where it stands, so its own cells are in view;
  // otherwise the default warehouse opens first.
  const standing = slots?.find(slot =>
    orderLocations.some(spot => spot.current && spot.location_id === slot.location_id)
  )
  const inWarehouse = warehouse ?? standing?.warehouse ?? warehouses[0] ?? ''
  const listed = (slots ?? []).filter(slot => (slot.warehouse ?? '') === inWarehouse)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={next => {
        if (next) return
        setTab(null)
        setWarehouse(null)
      }}
    >
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Select location · Order {orderNumber}</DialogTitle>
          <DialogDescription>
            Defaults to {board.name} locations — click an available cell to put this package there.
            Multi-Order cells show an order count (e.g. 2/4) and accept several orders up to their
            cap or Max Weight; greyed cells are full or single-order and in use. Adding a 2nd
            location oranges the earlier one. Click one of this order&rsquo;s own cells to remove
            it.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={String(shown ?? '')}
          onValueChange={value => {
            setTab(Number(value))
            setWarehouse(null)
          }}
        >
          <TabsList variant='line'>
            {inBoardOrder(departments).map(department => (
              <TabsTrigger key={department.id} value={String(department.id)}>
                {department.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {warehouses.length > 1 ? (
          <Tabs value={inWarehouse} onValueChange={value => setWarehouse(String(value))}>
            <TabsList>
              {warehouses.map(name => (
                <TabsTrigger key={name} value={name}>
                  {name || 'No warehouse'}
                  {name === defaultName ? (
                    <span className='text-xs text-muted-foreground'>default</span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}

        <div className='scrollport max-h-96 min-h-56 overflow-y-auto'>
          {isPending ? (
            <Skeleton className='h-56' />
          ) : listed.length ? (
            <div className='grid grid-cols-4 gap-2 sm:grid-cols-6'>
              {listed.map(slot => {
                const mine = orderLocations.find(spot => spot.location_id === slot.location_id)
                const predictOver = stagedWeight > 0 && overWeight(slot, stagedWeight)
                const over = overWeight(slot) || predictOver

                return (
                  <button
                    key={slot.location_id}
                    type='button'
                    disabled={!mine && !slot.available}
                    title={`${slot.name ?? slot.location_id} · ${slot.used_weight}${slot.max_weight === null ? '' : `/${slot.max_weight}`} lb · ${slot.orders_on_it}/${slot.max_orders ?? 1}${slot.multi_order ? ' orders (Multi-Order)' : ' order'}${mine ? ' · click to remove it from this order' : ''}`}
                    className={cn(
                      'rounded-md border border-border bg-background px-1 py-2 text-center font-mono text-sm leading-tight font-medium hover:border-input disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground',
                      mine
                        ? tintOf(over, mine.orange)
                        : slot.available && predictOver
                          ? TINT.over
                          : undefined
                    )}
                    onClick={() => {
                      onOpenChange(false)
                      if (mine) onRemove(mine)
                      else onPick(slot)
                    }}
                  >
                    {slot.name ?? slot.location_id}
                    {slot.multi_order ? (
                      <span className='block text-xs opacity-75'>
                        {slot.orders_on_it}/{slot.max_orders ?? '∞'}
                      </span>
                    ) : null}
                  </button>
                )
              })}
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

type LocationChipsProps = {
  locations: ShownLocation[]
  onRemove: (location: OrderLocation) => void
}

/** The locations an order stands on, each a chip that asks to take it off. */
export const LocationChips = ({ locations, onRemove }: LocationChipsProps) => {
  if (!locations.length)
    return <span className='text-xs text-muted-foreground'>No location assigned</span>

  return locations.map(spot => {
    const over = !!spot.over || (spot.remaining_weight !== null && spot.remaining_weight < 0)

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
        className={cn(
          'rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium hover:brightness-95',
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
      <AlertDialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Location required</AlertDialogTitle>
            <AlertDialogDescription>
              An order with existing packages needs to have at least 1 location, please select a
              location to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => {
                onOpenChange(false)
                onReplace()
              }}
            >
              Select new location
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
