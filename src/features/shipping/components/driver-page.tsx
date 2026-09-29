import { usePageHeader } from '@/components/layout/page-header-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatLongDate } from '@/lib/days'
import { Check, Truck } from 'lucide-react'
import { useCompleteLoad, useDelivered, useLeftWarehouse } from '../api'
import { formatWeight } from '../lib/format'
import { statusLabel } from '../lib/status'
import { useDayLoads } from '../lib/day-loads'
import { DayPicker } from './day-picker'

// Loaded and waiting to leave, on the road, or delivered and waiting to be closed.
const DRIVER_LOADS = new Set(['loaded', 'en_route', 'delivered'])

type DriverPageProps = {
  day: string
  onDayChange: (day: string) => void
}

/**
 * The Driver's window: he checks off leaving the warehouse p3 (592,540), each order as it is
 * delivered p3 (592,558), and closes the Load once every order is p3 (592,574).
 */
export const DriverPage = ({ day, onDayChange }: DriverPageProps) => {
  usePageHeader({ trail: [formatLongDate(day)] })
  const { loads, isPending } = useDayLoads(day, DRIVER_LOADS)
  const leave = useLeftWarehouse()
  const deliver = useDelivered()
  const complete = useCompleteLoad()

  return (
    <section className='flex min-w-0 flex-1 flex-col gap-4'>
      <DayPicker day={day} onDayChange={onDayChange} />

      {isPending ? (
        <Skeleton className='h-40' />
      ) : !loads.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Truck />
            </EmptyMedia>
            <EmptyTitle>No Load to drive {formatLongDate(day)}</EmptyTitle>
            <EmptyDescription>A Load shows here once everything on it is Loaded.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        loads.map(({ card, load }) => (
          <section
            key={load.load_id}
            className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'
          >
            <header className='flex flex-wrap items-center gap-3 px-3 py-2.5'>
              <span className='font-medium'>
                Truck {card.name} · {load.name}
              </span>
              <span className='font-mono text-sm text-muted-foreground'>
                {formatWeight(load.weight)}
              </span>
              <Badge variant='muted'>{statusLabel(load.status)}</Badge>
              {load.status === 'loaded' ? (
                <Button
                  className='ml-auto'
                  disabled={leave.isPending}
                  onClick={() => leave.mutate(load.load_id)}
                >
                  {leave.isPending ? <Spinner data-icon='inline-start' /> : null}
                  Left the warehouse
                </Button>
              ) : load.status === 'delivered' ? (
                <Button
                  className='ml-auto'
                  disabled={complete.isPending}
                  onClick={() => complete.mutate(load.load_id)}
                >
                  <Check data-icon='inline-start' />
                  Complete {load.name}
                </Button>
              ) : null}
            </header>
            <ul>
              {load.orders.map(order => (
                <li
                  key={order.assignment_id}
                  className='flex items-center gap-3 border-t border-border px-3 py-2 text-sm'
                >
                  <span className='w-28 font-mono font-medium'>{order.order_number ?? '—'}</span>
                  <span className='min-w-0 flex-1 truncate'>{order.customer ?? '—'}</span>
                  <span className='text-xs text-muted-foreground'>{statusLabel(order.status)}</span>
                  {/* Only a Load on the road delivers; before that the orders are the dock's. */}
                  {load.status === 'en_route' && order.status !== 'delivered' ? (
                    <Button
                      variant='outline'
                      disabled={deliver.isPending}
                      onClick={() => deliver.mutate([order.assignment_id])}
                    >
                      Delivered
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  )
}
