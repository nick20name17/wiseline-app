import { usePageHeader } from '@/components/layout/page-header-context'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatLongDate } from '@/lib/days'
import { Check, Truck } from 'lucide-react'
import { useCompleteLoad, useDelivered, useLeftWarehouse } from '../api'
import { useDayLoads } from '../lib/day-loads'
import { DayPicker } from './day-picker'
import { LoadCard, OrderLine } from './load-card'

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
          <LoadCard
            key={load.load_id}
            card={card}
            load={load}
            action={
              load.status === 'loaded' ? (
                <Button disabled={leave.isPending} onClick={() => leave.mutate(load.load_id)}>
                  {leave.isPending ? <Spinner data-icon='inline-start' /> : null}
                  Left the warehouse
                </Button>
              ) : load.status === 'delivered' ? (
                <Button disabled={complete.isPending} onClick={() => complete.mutate(load.load_id)}>
                  <Check data-icon='inline-start' />
                  Complete {load.name}
                </Button>
              ) : null
            }
          >
            {load.orders.map(order => (
              <OrderLine
                key={order.assignment_id}
                order={order}
                trail={
                  // Only a Load on the road delivers; before that the orders are the dock's.
                  load.status === 'en_route' && order.status !== 'delivered' ? (
                    <Button
                      variant='outline'
                      disabled={deliver.isPending}
                      onClick={() => deliver.mutate([order.assignment_id])}
                    >
                      Delivered
                    </Button>
                  ) : null
                }
              />
            ))}
          </LoadCard>
        ))
      )}
    </section>
  )
}
