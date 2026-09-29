import { usePageHeader } from '@/components/layout/page-header-context'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLongDate } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { PackageOpen } from 'lucide-react'
import { orderPackagesQuery, useMarkLoaded, type Assignment, type LoadTab } from '../api'
import { formatWeight } from '../lib/format'
import { statusLabel } from '../lib/status'
import { useDayLoads } from '../lib/day-loads'
import { DayPicker } from './day-picker'

// A Load reaches this window once it is released p3 (598,468) and leaves it once the truck is gone.
const ON_THE_DOCK = new Set(['not_started', 'loading', 'loaded'])

type OrderPackagesProps = { load: LoadTab; order: Assignment }

/** One order's packages, ticked onto the truck one by one. */
const OrderPackages = ({ load, order }: OrderPackagesProps) => {
  const { data: packages, isPending } = useQuery(orderPackagesQuery(order.order ?? ''))
  const mark = useMarkLoaded()

  return (
    <li className='border-t border-border px-3 py-2'>
      <div className='flex items-center gap-3 text-sm'>
        <span className='w-28 font-mono font-medium'>{order.order_number ?? '—'}</span>
        <span className='min-w-0 flex-1 truncate'>{order.customer ?? '—'}</span>
        <span className='text-xs text-muted-foreground'>{statusLabel(order.status) ?? ''}</span>
      </div>
      {isPending ? (
        <Skeleton className='mt-2 h-6' />
      ) : packages?.length ? (
        <ul className='mt-2 flex flex-wrap gap-2'>
          {packages.map(pack => (
            <li key={pack.package_id}>
              <label className='flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1 text-sm'>
                <Checkbox
                  aria-label={`${pack.name ?? pack.package_id} loaded`}
                  checked={pack.is_loaded}
                  disabled={mark.isPending}
                  onCheckedChange={checked =>
                    mark.mutate({
                      loadId: load.load_id,
                      packageIds: [pack.package_id],
                      loaded: checked === true
                    })
                  }
                />
                <span className='font-mono'>{pack.name ?? pack.package_id}</span>
                <span className='text-xs text-muted-foreground'>
                  {pack.location ?? '—'} · {pack.weight === null ? '—' : formatWeight(pack.weight)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className='mt-1 text-xs text-muted-foreground'>No packages made for this order yet.</p>
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
  const { loads: released, isPending } = useDayLoads(day, ON_THE_DOCK)

  return (
    <section className='flex min-w-0 flex-1 flex-col gap-4'>
      <DayPicker day={day} onDayChange={onDayChange} />

      {isPending ? (
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
        released.map(({ card, load }) => (
          <section
            key={load.load_id}
            className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'
          >
            <header className='flex items-center gap-3 px-3 py-2.5'>
              <span className='font-medium'>
                Truck {card.name} · {load.name}
              </span>
              <span className='font-mono text-sm text-muted-foreground'>
                {formatWeight(load.weight)}
              </span>
              <Badge variant='muted' className='ml-auto'>
                {statusLabel(load.status)}
              </Badge>
            </header>
            <ul>
              {load.orders.map(order => (
                <OrderPackages key={order.assignment_id} load={load} order={order} />
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  )
}
