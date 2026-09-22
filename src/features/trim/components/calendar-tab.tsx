import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { departmentStateOf, overdueQuery, scheduledOrdersQuery, type TrimOrder } from '../api'
import { formatDate, toIsoDay, today } from '../lib/format'
import { orderStatus } from '../lib/status'
import { StatusPill } from './status-pill'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const monthLabel = (month: Date) =>
  month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

/** The days of the grid: the month, plus the blanks that push the 1st onto its weekday. */
const gridOf = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()

  return [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length }, (_, index) =>
      toIsoDay(new Date(month.getFullYear(), month.getMonth(), index + 1))
    )
  ]
}

type CalendarTabProps = {
  departmentId: number | undefined
  search: string | undefined
  onOpenDay: (day: string) => void
}

/**
 * The month at a glance: how many orders sit on each production day, and which days carry work that
 * is already late. Nothing is scheduled from here — a day leads back to the Scheduled tab, which is
 * where the board works.
 */
export const CalendarTab = ({ departmentId, search, onOpenDay }: CalendarTabProps) => {
  const start = today()
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState(start)

  // The same list the Scheduled tab reads, so the two always agree on what is on a day.
  const { data: page, isPending } = useQuery(scheduledOrdersQuery(search, null))
  const { data: overdue } = useQuery(overdueQuery(departmentId))

  const dayOf = (order: TrimOrder) =>
    departmentStateOf(order, departmentId)?.production_date ?? null

  const orders = page?.results ?? []
  const counts = new Map<string, number>()
  for (const order of orders) {
    const day = dayOf(order)
    if (day) counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  const onSelectedDay = orders.filter(order => dayOf(order) === selected)
  const step = (months: number) =>
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + months, 1))

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <div className='flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-xs'>
        <div className='flex items-center gap-2'>
          <h2 className='font-heading text-lg font-semibold'>{monthLabel(month)}</h2>
          <span className='ml-auto flex items-center gap-2'>
            <Button variant='outline' onClick={() => setMonth(new Date())}>
              Today
            </Button>
            <Button
              variant='outline'
              size='icon'
              aria-label='Previous month'
              onClick={() => step(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button variant='outline' size='icon' aria-label='Next month' onClick={() => step(1)}>
              <ChevronRight />
            </Button>
          </span>
        </div>

        <div className='grid grid-cols-7 gap-1.5'>
          {WEEKDAYS.map(day => (
            <span
              key={day}
              className='text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase'
            >
              {day}
            </span>
          ))}

          {gridOf(month).map((day, index) =>
            day === null ? (
              <span key={`blank-${index}`} />
            ) : (
              <button
                key={day}
                type='button'
                aria-label={formatDate(day)}
                aria-pressed={day === selected}
                className={cn(
                  'h-20 rounded-md border border-border p-2 text-left align-top hover:border-input',
                  // A weekend is not a work day; it is drawn back rather than taken away, because
                  // work does land on one.
                  [0, 6].includes(new Date(`${day}T00:00:00`).getDay()) && 'bg-muted/40',
                  day === selected && 'border-primary bg-primary/10'
                )}
                onClick={() => setSelected(day)}
              >
                <span className={cn('block text-sm font-medium', day === start && 'text-primary')}>
                  {Number(day.slice(-2))}
                </span>
                {counts.get(day) ? (
                  <span
                    className={cn(
                      'mt-1 inline-block rounded-full px-1.5 py-0.5 font-mono text-xs',
                      overdue?.days.includes(day)
                        ? 'bg-destructive/15 text-destructive'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    {counts.get(day)} ord
                  </span>
                ) : null}
              </button>
            )
          )}
        </div>
      </div>

      <div className='flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs'>
        <div className='flex flex-wrap items-center gap-3'>
          <span className='flex flex-col'>
            <span className='font-medium'>
              {formatDate(selected)}
              {selected === start ? ' · today' : ''}
            </span>
            <span className='text-sm text-muted-foreground'>
              {onSelectedDay.length} order{onSelectedDay.length === 1 ? '' : 's'} scheduled
            </span>
          </span>

          <Button variant='outline' className='ml-auto' onClick={() => onOpenDay(selected)}>
            <ArrowRight data-icon='inline-start' />
            Open in Scheduled
          </Button>
        </div>

        {isPending ? (
          <Skeleton className='h-20' />
        ) : onSelectedDay.length ? (
          <ul className='flex flex-col'>
            {onSelectedDay.map(order => (
              <li
                key={order.id}
                className='flex items-center gap-3 border-t border-border py-2 text-sm'
              >
                <span className='font-mono'>{order.invoice}</span>
                <span className='truncate text-muted-foreground'>{order.customer ?? 'Stock'}</span>
                <span className='ml-auto'>
                  <StatusPill
                    status={orderStatus(departmentStateOf(order, departmentId)?.status ?? null)}
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='border-t border-border pt-3 text-sm text-muted-foreground'>
            Nothing is scheduled for this day.
          </p>
        )}
      </div>
    </div>
  )
}
