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
import { truckPanelsQuery, useApplyShipping, type UnscheduledOrder } from '../api'
import { formatLength, formatWeight } from '../lib/format'

type ScheduleDialogProps = {
  orders: UnscheduledOrder[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied: (shipDate: string) => void
}

/**
 * The Schedule window p3 (570,212): a Ship Date, then a truck. The trucks are closed until the date is
 * set p3 (562,244); picking one fills in what it would carry, and only then can the Manager apply
 * p3 (562,263). Over a truck's limit is orange and nothing more p3 (587,259).
 */
export const ScheduleDialog = ({ orders, open, onOpenChange, onApplied }: ScheduleDialogProps) => {
  const [shipDate, setShipDate] = useState<string | null>(null)
  const [truckId, setTruckId] = useState<number | null>(null)
  const ids = orders.map(order => order.order)
  const { data: panels, isPending } = useQuery({
    ...truckPanelsQuery(ids, shipDate),
    enabled: open && !!shipDate && ids.length > 0
  })
  const apply = useApplyShipping(() => {
    onOpenChange(false)
    if (shipDate) onApplied(shipDate)
  })

  const weight = orders.reduce((total, order) => total + order.weight, 0)
  const longest = orders.reduce((most, order) => Math.max(most, order.longest_length), 0)

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        onOpenChange(next)
        if (!next) {
          setShipDate(null)
          setTruckId(null)
        }
      }}
    >
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            Schedule {orders.length} order{orders.length === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>
            Delivery orders: {formatWeight(weight)} · longest {formatLength(longest)}
          </DialogDescription>
        </DialogHeader>

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
                      Limit {panel.weight_limit === null ? '—' : formatWeight(panel.weight_limit)}
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
              shipDate && truckId !== null && apply.mutate({ orders: ids, shipDate, truckId })
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
