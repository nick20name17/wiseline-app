import { usePageHeader } from '@/components/layout/page-header-context'
import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLongDate } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { Truck } from 'lucide-react'
import { dayLoadsQuery } from '../api'
import { DayPicker } from './day-picker'
import { DriverLoad } from './driver-load'

// Loaded and waiting to leave, on the road, or delivered and waiting to be closed.
const DRIVER_LOADS: readonly string[] = ['loaded', 'en_route', 'delivered']

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
  const { data: loads = [], isPending, error, refetch } = useQuery(dayLoadsQuery(day, DRIVER_LOADS))

  return (
    <section className='flex min-w-0 flex-1 flex-col gap-4'>
      <DayPicker day={day} onDayChange={onDayChange} />

      {error ? (
        <QueryError title='The Loads to drive did not load' error={error} onRetry={refetch} />
      ) : isPending ? (
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
        loads.map(load => <DriverLoad key={load.load_id} load={load} day={day} />)
      )}
    </section>
  )
}
