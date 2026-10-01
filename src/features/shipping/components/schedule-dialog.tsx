import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, fromIsoDay, toIsoDay } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { useState } from 'react'
import {
  selectionTotalsQuery,
  truckPanelsQuery,
  useApplyShipping,
  type Selection,
  type ShipmentTotals
} from '../api'
import { formatLength, formatWeight } from '../lib/format'

type ScheduleDialogProps = {
  selection: Selection
  /** «Schedule» from Unscheduled; «Reschedule» for orders already on a truck p3 (591,341). */
  verb: 'Schedule' | 'Reschedule'
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied: (shipDate: string) => void
}

/**
 * The Schedule window p3 (570,212): a Ship Date, then a truck. The trucks are closed until the date is
 * set p3 (562,244); picking one fills in what it would carry, and only then can the Manager apply
 * p3 (562,263). Over a truck's limit is orange and nothing more p3 (587,259).
 */
export const ScheduleDialog = ({
  selection,
  verb,
  open,
  onOpenChange,
  onApplied
}: ScheduleDialogProps) => {
  const [shipDate, setShipDate] = useState<string | null>(null)
  const [truckId, setTruckId] = useState<number | null>(null)
  const count = selection.orders.length + selection.pickupIds.length
  const { data: totals } = useQuery({
    ...selectionTotalsQuery(selection),
    enabled: open && count > 0
  })
  const { data: panels, isPending } = useQuery(truckPanelsQuery(selection, open ? shipDate : null))
  const close = () => {
    onOpenChange(false)
    setShipDate(null)
    setTruckId(null)
  }
  const apply = useApplyShipping(() => {
    close()
    if (shipDate) onApplied(shipDate)
  })

  return (
    <Dialog open={open} onOpenChange={next => (next ? onOpenChange(true) : close())}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            {verb} {count} order{count === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>A Ship Date, then the truck they go on.</DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-2'>
          <TotalsBox label='Delivery Orders' totals={totals?.delivery} longest />
          <TotalsBox label='Pickups' totals={totals?.pickup} />
        </div>

        <div className='flex flex-col gap-4'>
          <div className='flex items-center gap-3'>
            <span className='text-sm font-medium'>Ship Date</span>
            <DatePicker
              value={shipDate ? fromIsoDay(shipDate) : new Date()}
              onChange={date => {
                setShipDate(toIsoDay(date))
                setTruckId(null)
              }}
              format={date => (shipDate ? formatDate(toIsoDay(date)) : 'Select Ship Date…')}
            />
          </div>

          {!shipDate ? (
            <p className='text-sm text-muted-foreground'>Pick a Ship Date to choose a truck.</p>
          ) : isPending ? (
            <Skeleton className='h-32' />
          ) : (
            // A fleet runs past the window, so the trucks scroll and Apply stays in reach.
            <fieldset className='scrollport grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2'>
              <legend className='sr-only'>Truck</legend>
              {(panels ?? []).map(panel => {
                const picked = panel.truck_id === truckId
                return (
                  <label
                    key={panel.truck_id}
                    className={cn(
                      'cursor-pointer rounded-lg border border-border p-3 text-left text-sm hover:border-input has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                      picked && 'border-primary bg-primary/10'
                    )}
                  >
                    <input
                      type='radio'
                      name='truck'
                      className='sr-only'
                      checked={picked}
                      onChange={() => setTruckId(panel.truck_id)}
                    />
                    <span className='font-medium'>Truck {panel.name}</span>
                    <span className='block text-muted-foreground'>
                      Limit {formatWeight(panel.weight_limit)}
                      {panel.max_length ? ` · ${formatLength(panel.max_length)}` : ''}
                    </span>
                    <span
                      className={cn(
                        'mt-1 block font-mono',
                        picked &&
                          panel.over_weight_limit &&
                          'rounded bg-warning/15 px-1 text-warning'
                      )}
                      title={panel.over_weight_limit ? 'Over the weight limit' : undefined}
                    >
                      {picked
                        ? formatWeight(panel.assigned_weight)
                        : formatWeight(panel.already_assigned_weight)}
                      {picked ? ' with these' : ' already on it'}
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}
        </div>

        <div className='mt-2 flex justify-end gap-2'>
          <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
          <Button
            disabled={!shipDate || truckId === null || apply.isPending}
            onClick={() =>
              shipDate && truckId !== null && apply.mutate({ ...selection, shipDate, truckId })
            }
          >
            {apply.isPending ? <Spinner data-icon='inline-start' /> : null}
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type TotalsBoxProps = { label: string; totals: ShipmentTotals | undefined; longest?: boolean }

/** One of the window's two boxes; a pickup's length is not the Manager's concern here p3 (586,246). */
const TotalsBox = ({ label, totals, longest = false }: TotalsBoxProps) => (
  <div className='rounded-lg border border-border p-3 text-sm'>
    <span className='text-muted-foreground'>
      {label} · {totals?.count ?? 0}
    </span>
    {totals ? (
      <span className='block font-mono'>
        {formatWeight(totals.total_weight)}
        {longest && totals.count ? ` · longest ${formatLength(totals.longest_length)}` : ''}
      </span>
    ) : (
      <Skeleton className='mt-1 h-5 w-32' />
    )}
  </div>
)
