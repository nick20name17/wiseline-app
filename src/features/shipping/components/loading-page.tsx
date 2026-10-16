import { usePageHeader } from '@/components/layout/page-header-context'
import { QueryError } from '@/components/query-error'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLongDate } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { PackageOpen } from 'lucide-react'
import { dayLoadsQuery, useMarkLoaded, type DayLoad } from '../api'
import { formatWeight } from '../lib/format'
import { statusLabel } from '../lib/status'
import { DayPicker } from './day-picker'
import { LoadCard, OrderLine } from './load-card'
import { ReadyCount } from './order-readiness'

// A Load reaches this window once it is released p3 (598,468) and leaves it once the truck is gone.
const ON_THE_DOCK: readonly string[] = ['not_started', 'loading', 'loaded']

type OrderPackagesProps = {
  load: DayLoad
  order: DayLoad['orders'][number] & { order: string }
}

/** One order's packages, ticked onto the truck one by one. */
const OrderPackages = ({ load, order }: OrderPackagesProps) => {
  const mark = useMarkLoaded()

  return (
    <li className='border-t border-border px-3 py-2'>
      {/* On a phone the customer takes a line of its own under the order and its status. */}
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
        <span className='w-28 font-mono font-medium max-md:w-auto'>
          {order.order_number ?? '—'}
        </span>
        <span className='min-w-0 flex-1 truncate max-md:order-last max-md:basis-full'>
          {order.customer ?? '—'}
        </span>
        <span className='text-xs text-muted-foreground max-md:ml-auto'>
          {statusLabel(order.status) ?? ''}
        </span>
        {/* Loaded waits for every line, packaged or not yet (round 10, C3): this says what is left. */}
        <ReadyCount order={order.order} readiness={order} />
      </div>
      {order.packages.length ? (
        // One package a line on a phone, each a full-width target for a gloved thumb.
        <ul className='mt-2 flex flex-wrap gap-2 max-md:flex-col'>
          {order.packages.map(pack => (
            <li key={pack.package_id}>
              <label className='flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1 text-sm max-md:min-h-11 max-md:px-3'>
                <Checkbox
                  aria-label={`${pack.name ?? pack.package_id} loaded`}
                  checked={pack.is_loaded}
                  onCheckedChange={checked =>
                    mark.mutate({
                      loadId: load.load_id,
                      packageIds: [pack.package_id],
                      loaded: checked === true
                    })
                  }
                />
                <span className='font-mono'>{pack.name ?? pack.package_id}</span>
                <span className='text-xs text-muted-foreground max-md:ml-auto'>
                  {pack.location ?? '—'} · {formatWeight(pack.weight)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className='mt-1 text-xs text-muted-foreground'>
          {/* Every line bought in: the server counts it Loaded at release. */}
          {order.lines_made
            ? 'No packages made for this order yet.'
            : 'Nothing to package: goes on with the Load.'}
        </p>
      )}
    </li>
  )
}

type LoadingPageProps = {
  day: string
  onDayChange: (day: string) => void
}

/**
 * The Loading window: the day's released Loads, truck by truck, and their orders' packages marked
 * onto the truck as they go on.
 */
export const LoadingPage = ({ day, onDayChange }: LoadingPageProps) => {
  usePageHeader({ trail: [formatLongDate(day)] })
  const {
    data: released = [],
    isPending,
    error,
    refetch
  } = useQuery(dayLoadsQuery(day, ON_THE_DOCK))

  return (
    <section className='flex min-w-0 flex-1 flex-col gap-4'>
      <DayPicker day={day} onDayChange={onDayChange} />

      {error ? (
        <QueryError title='The Loads to load did not load' error={error} onRetry={refetch} />
      ) : isPending ? (
        <Skeleton className='h-40' />
      ) : !released.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <PackageOpen />
            </EmptyMedia>
            <EmptyTitle>Nothing to load {formatLongDate(day)}</EmptyTitle>
            <EmptyDescription>
              A Load shows here once Shipping releases it to Loading.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        released.map(load => (
          <LoadCard key={load.load_id} load={load}>
            {load.orders.map(order =>
              // A supplier pickup carries no sales order, so nothing of ours to tick onto the truck.
              order.order === null ? (
                <OrderLine key={order.assignment_id} order={order} />
              ) : (
                <OrderPackages
                  key={order.assignment_id}
                  load={load}
                  order={{ ...order, order: order.order }}
                />
              )
            )}
          </LoadCard>
        ))
      )}
    </section>
  )
}
