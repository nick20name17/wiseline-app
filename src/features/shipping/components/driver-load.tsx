import { Button } from '@/components/ui/button'
import { Progress, ProgressLabel } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { formatLongDate } from '@/lib/days'
import { cn } from 'cn'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, Map as MapIcon, MapPin, Truck } from 'lucide-react'
import {
  orderPackagesQuery,
  routeQuery,
  useCompleteLoad,
  useDelivered,
  useLeftWarehouse,
  type Assignment,
  type DayLoad,
  type Stop
} from '../api'
import { formatWeight, mapUrl, routeUrl } from '../lib/format'
import { statusLabel } from '../lib/status'

type DriverLoadProps = { load: DayLoad; day: string }

/**
 * One Load as the Driver's phone shows it: the truck, how far the run is, and a card per stop in
 * delivery order. The stops follow the planned route; an unplanned Load keeps the order it was loaded.
 */
export const DriverLoad = ({ load, day }: DriverLoadProps) => {
  const { data: stops = [] } = useQuery(routeQuery(load.load_id))
  const leave = useLeftWarehouse()
  const complete = useCompleteLoad()

  const deliveries = load.orders.filter(order => order.kind === 'delivery')
  const done = deliveries.filter(order => order.status === 'delivered').length
  const route = routeUrl(stops)

  const stopOf = (order: Assignment) =>
    stops.find(stop => !stop.dispatch_point && stop.order_number === order.order_number)
  const inRunOrder = load.orders.toSorted(
    (a, b) => (stopOf(a)?.sequence ?? Infinity) - (stopOf(b)?.sequence ?? Infinity)
  )

  return (
    <section className='mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
      <header className='bg-foreground px-4.5 pt-4 pb-4.5 text-background'>
        <div className='flex items-center gap-3'>
          <div className='grid size-10.5 flex-none place-items-center rounded-xl bg-background/10'>
            <Truck className='size-5.5' />
          </div>
          <div className='min-w-0'>
            <div className='text-lg font-semibold'>
              {load.truck ? `Truck ${load.truck.name} · ` : ''}
              {load.name}
            </div>
            <div className='text-xs text-background/70'>
              {formatLongDate(day)} · {deliveries.length} stop{deliveries.length === 1 ? '' : 's'}
            </div>
          </div>
          <span className='ml-auto rounded-full bg-background/15 px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase'>
            {statusLabel(load.status)}
          </span>
        </div>
      </header>

      <div className='border-b border-border px-4.5 py-3.5'>
        <Progress value={done} max={Math.max(1, deliveries.length)}>
          <ProgressLabel>Delivered</ProgressLabel>
          <span className='ml-auto text-sm text-muted-foreground tabular-nums'>
            {done} / {deliveries.length}
          </span>
        </Progress>
      </div>

      <ol className='flex flex-col gap-3 p-3.5'>
        {load.status === 'delivered' ? (
          <li className='rounded-2xl border border-dashed border-input p-4.5 text-center text-muted-foreground'>
            <Check className='mb-2 inline size-8.5 text-success' />
            <h3 className='mb-1 text-base font-bold text-foreground'>Route complete</h3>
            <p>All stops delivered. Close the Load to finish the run.</p>
          </li>
        ) : null}
        {inRunOrder.map((order, index) => (
          <DriverStop
            key={order.assignment_id}
            order={order}
            seq={stopOf(order)?.sequence ?? index + 1}
            stop={stopOf(order)}
            onTheRoad={load.status === 'en_route'}
          />
        ))}
      </ol>

      <footer className='flex flex-col gap-2 border-t border-border px-4.5 pt-3.5 pb-5.5'>
        {route ? (
          <Button
            variant='outline'
            className='w-full'
            nativeButton={false}
            render={
              <a
                href={route}
                target='_blank'
                rel='noreferrer'
                aria-label={`The run of ${load.name} in Maps`}
              />
            }
          >
            <MapIcon data-icon='inline-start' />
            Open the route in Maps
          </Button>
        ) : null}
        {load.status === 'loaded' ? (
          <Button
            className='w-full'
            disabled={leave.isPending}
            onClick={() => leave.mutate(load.load_id)}
          >
            {leave.isPending ? (
              <Spinner data-icon='inline-start' />
            ) : (
              <ArrowRight data-icon='inline-start' />
            )}
            Left the warehouse
          </Button>
        ) : load.status === 'delivered' ? (
          <Button
            className='w-full'
            disabled={complete.isPending}
            onClick={() => complete.mutate(load.load_id)}
          >
            <Check data-icon='inline-start' />
            Complete {load.name}
          </Button>
        ) : null}
      </footer>
    </section>
  )
}

type DriverStopProps = {
  order: Assignment
  seq: number
  stop: Stop | undefined
  /** Only a Load on the road delivers; before that the orders are the dock's. */
  onTheRoad: boolean
}

const DriverStop = ({ order, seq, stop, onTheRoad }: DriverStopProps) => {
  const deliver = useDelivered()
  const { data: packages = [] } = useQuery({
    ...orderPackagesQuery(order.order ?? ''),
    enabled: !!order.order
  })
  const delivered = order.status === 'delivered'
  const next = onTheRoad && !delivered

  return (
    <li
      className={cn(
        'overflow-hidden rounded-2xl border border-border shadow-xs',
        delivered && 'opacity-70',
        next && 'border-primary/40 ring-2 ring-primary'
      )}
    >
      <div className='flex items-center gap-3 p-3.5'>
        <span
          className={cn(
            'grid size-7.5 flex-none place-items-center rounded-full text-sm font-semibold',
            delivered ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
          )}
        >
          {delivered ? '✓' : seq}
        </span>
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold'>{order.customer ?? '—'}</div>
          <div className='text-xs text-muted-foreground'>
            {order.kind === 'pickup' ? 'Supplier pickup' : order.order_number}
          </div>
        </div>
      </div>
      {stop?.address ? (
        <div className='flex items-center gap-1.75 pr-3.5 pb-3 pl-14 text-sm text-muted-foreground'>
          <MapPin className='size-3.5 flex-none' />
          <span className='truncate'>{[stop.address, stop.city].filter(Boolean).join(', ')}</span>
        </div>
      ) : null}
      <div className='flex gap-3.5 pr-3.5 pb-3 pl-14 text-xs text-muted-foreground'>
        <span className='font-medium tabular-nums'>{formatWeight(order.weight)}</span>
        {order.order ? (
          <span>
            <span className='font-medium tabular-nums'>{packages.length}</span> package
            {packages.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {delivered ? (
        <div className='flex items-center justify-center gap-1.75 border-t border-border bg-success/10 p-3 text-sm font-semibold text-success'>
          <Check className='size-3.5' />
          Delivered
        </div>
      ) : order.kind === 'delivery' ? (
        <div className='flex gap-2 border-t border-border bg-muted/40 px-3.5 py-3'>
          <Button
            variant='outline'
            className='flex-1'
            disabled={!stop?.address}
            nativeButton={!stop?.address}
            render={
              stop?.address ? (
                <a
                  href={mapUrl(stop.address, stop.city)}
                  target='_blank'
                  rel='noreferrer'
                  aria-label={`Navigate to ${order.customer ?? 'the stop'}`}
                />
              ) : undefined
            }
          >
            <MapIcon data-icon='inline-start' />
            Navigate
          </Button>
          <Button
            className='flex-1'
            disabled={!onTheRoad || deliver.isPending}
            onClick={() => deliver.mutate([order.assignment_id])}
          >
            {deliver.isPending ? (
              <Spinner data-icon='inline-start' />
            ) : (
              <Check data-icon='inline-start' />
            )}
            Delivered
          </Button>
        </div>
      ) : null}
    </li>
  )
}
