import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, addMonths, getDaysInMonth, isWeekend, startOfMonth } from 'date-fns'
import { useMemo, useState } from 'react'
import {
  calendarOrdersQuery,
  dayStripQuery,
  departmentStateOf,
  overdueQuery,
  type TrimOrder
} from '../api'
import { formatCount, formatDate, fromIsoDay, toIsoDay, today } from '../lib/format'
import { partDays } from '../lib/parts'
import { PriorityPill } from './priority-pill'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const monthLabel = (month: Date) =>
  month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

/** The days of the grid: the month, plus the blanks that push the 1st onto its weekday. */
const gridOf = (month: Date) => [
  ...Array.from({ length: month.getDay() }, () => null),
  ...Array.from({ length: getDaysInMonth(month) }, (_, index) => toIsoDay(addDays(month, index)))
]

// Settings › Work Days has no endpoint yet (see TODO.md), so the weekend stands in for the days off.
const isWorkDay = (day: string) => !isWeekend(fromIsoDay(day))

type CalendarTabProps = {
  departmentId: number | undefined
  onOpenDay: (day: string) => void
}

/**
 * The month at a glance: how many orders sit on each production day, and which days carry work that
 * is already late. Nothing is scheduled from here — a day leads back to the Scheduled tab, which is
 * where the board works. The header search narrows the board, not the month.
 */
export const CalendarTab = ({ departmentId, onOpenDay }: CalendarTabProps) => {
  const start = today()
  // The 1st of the month on show, which is where both the grid and the day strip start.
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(start)

  const { data: orders = [], isPending } = useQuery(calendarOrdersQuery)
  const { data: overdue } = useQuery(overdueQuery(departmentId))
  const { data: strip } = useQuery(
    dayStripQuery(departmentId, toIsoDay(month), getDaysInMonth(month))
  )
  const load = new Map(strip?.map(entry => [entry.date, entry]))
  const late = new Set(overdue?.days)

  // A split order sits on each of its days.
  const byDay = useMemo(() => {
    const days = new Map<string, TrimOrder[]>()
    for (const order of orders)
      for (const day of partDays(order, departmentId)) {
        const list = days.get(day)
        if (list) list.push(order)
        else days.set(day, [order])
      }
    return days
  }, [orders, departmentId])

  const onSelectedDay = byDay.get(selected) ?? []
  const step = (months: number) => setMonth(current => addMonths(current, months))

  const bendsOn = (day: string) => {
    const entry = load.get(day)
    if (!entry) return undefined
    return entry.capacity === null
      ? `${formatCount(entry.bends)} bends`
      : `${formatCount(entry.bends)} / ${formatCount(entry.capacity)} bends`
  }

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <div className='flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-xs'>
        <div className='flex items-center gap-2'>
          <h2 className='font-heading text-lg font-semibold'>{monthLabel(month)}</h2>
          <span className='ml-auto flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setMonth(startOfMonth(new Date()))
                setSelected(start)
              }}
            >
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

          {gridOf(month).map((day, index) => {
            if (day === null) return <span key={`blank-${index}`} />
            const count = byDay.get(day)?.length ?? 0

            return (
              <button
                key={day}
                type='button'
                aria-label={formatDate(day)}
                aria-pressed={day === selected}
                className={cn(
                  'h-20 rounded-md border border-border p-2 text-left align-top hover:border-input',
                  // A day off is drawn back rather than taken away, because work does land on one.
                  !isWorkDay(day) && 'bg-muted/40',
                  day === start && 'ring-2 ring-primary/60',
                  day === selected && 'border-primary bg-primary/10'
                )}
                onClick={() => setSelected(day)}
              >
                <span className={cn('block text-sm font-medium', day === start && 'text-primary')}>
                  {Number(day.slice(-2))}
                </span>
                {count ? (
                  <span
                    title={bendsOn(day)}
                    className={cn(
                      'mt-1 inline-block rounded-full px-1.5 py-0.5 font-mono text-xs',
                      late.has(day) ? 'bg-destructive text-white' : 'bg-primary/10 text-primary'
                    )}
                  >
                    {count} ord
                  </span>
                ) : null}
              </button>
            )
          })}
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
              {isWorkDay(selected) ? '' : ' · non-work day'}
            </span>
          </span>

          {onSelectedDay.length ? (
            <Button variant='outline' className='ml-auto' onClick={() => onOpenDay(selected)}>
              <ArrowRight data-icon='inline-start' />
              Open in Scheduled
            </Button>
          ) : null}
        </div>

        {isPending ? (
          <Skeleton className='h-20' />
        ) : onSelectedDay.length ? (
          <ul className='flex flex-col'>
            {onSelectedDay.map(order => {
              const state = departmentStateOf(order, departmentId)

              return (
                <li key={order.id} className='border-t border-border'>
                  <button
                    type='button'
                    className='flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/50'
                    onClick={() => onOpenDay(selected)}
                  >
                    <span className='font-mono'>{order.invoice}</span>
                    <span className='truncate text-muted-foreground'>
                      {order.customer ?? 'Stock'}
                    </span>
                    <span className='ml-auto flex items-center gap-2'>
                      {state?.priority ? <PriorityPill priority={state.priority} /> : null}
                      <Badge variant='muted'>
                        {state?.release_to_production
                          ? 'Released'
                          : state?.reviewed
                            ? 'Reviewed'
                            : 'Scheduled'}
                      </Badge>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className='border-t border-border pt-3 text-sm text-muted-foreground'>
            Nothing scheduled for this day.
          </p>
        )}
      </div>
    </div>
  )
}
