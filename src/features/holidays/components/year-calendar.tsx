import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, today } from '@/lib/days'
import { cn } from 'cn'
import { WEEKDAYS, type CalendarDay } from '../api'

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
const SHORT_DAY = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC'
})

const utcOf = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** The year's days cut into months, in order. */
const monthsOf = (days: CalendarDay[]) => {
  const months: CalendarDay[][] = []
  for (const day of days) {
    const index = Number(day.date.slice(5, 7)) - 1
    ;(months[index] ??= []).push(day)
  }
  return months
}

const nameOf = (day: CalendarDay) => day.holiday ?? day.working_day

const LEGEND = [
  { label: 'Work day', swatch: 'border border-border bg-card' },
  { label: 'Off', swatch: 'bg-muted' },
  { label: 'Holiday', swatch: 'bg-destructive/15' },
  { label: 'Working day', swatch: 'bg-primary/15' }
]

type YearCalendarProps = {
  days: CalendarDay[] | undefined
  /** Without it the days are read only. */
  onPick?: (day: CalendarDay) => void
}

/**
 * The year at a glance, Monday first as the work week counts: which days are worked, and the named
 * ones that break their weekday's rule. Each month lists its names beneath, since a cell has no room.
 */
export const YearCalendar = ({ days, onPick }: YearCalendarProps) => {
  const now = today()

  return (
    <div className='flex flex-col gap-4'>
      <ul className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
        {LEGEND.map(({ label, swatch }) => (
          <li key={label} className='flex items-center gap-1.5'>
            <span aria-hidden className={cn('size-3 rounded-sm', swatch)} />
            {label}
          </li>
        ))}
      </ul>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
        {days
          ? monthsOf(days).map(month => {
              const first = month[0]!
              const named = month.filter(nameOf)
              return (
                <section
                  key={first.date}
                  aria-label={MONTH.format(utcOf(first.date))}
                  className='flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-xs'
                >
                  <h3 className='font-heading text-sm font-semibold'>
                    {MONTH.format(utcOf(first.date))}
                  </h3>
                  <div className='grid grid-cols-7 gap-1'>
                    {WEEKDAYS.map(({ day, short }) => (
                      <span
                        key={day}
                        aria-hidden
                        className='text-center text-xs font-medium text-muted-foreground'
                      >
                        {short.slice(0, 2)}
                      </span>
                    ))}
                    {Array.from({ length: first.weekday - 1 }, (_, index) => (
                      <span key={`blank-${index}`} />
                    ))}
                    {month.map(day => {
                      const name = nameOf(day)
                      const label = [
                        formatDate(day.date),
                        day.is_work_day ? 'work day' : 'off',
                        name
                      ]
                        .filter(Boolean)
                        .join(' · ')
                      const className = cn(
                        'flex h-8 items-center justify-center rounded-md text-xs tabular-nums',
                        day.holiday
                          ? 'bg-destructive/15 font-semibold text-destructive'
                          : day.working_day
                            ? 'bg-primary/15 font-semibold text-primary'
                            : day.is_work_day
                              ? 'border border-border'
                              : 'bg-muted text-muted-foreground',
                        day.date === now && 'ring-2 ring-ring'
                      )
                      const number = Number(day.date.slice(8))
                      return onPick ? (
                        <button
                          key={day.date}
                          type='button'
                          title={name ?? undefined}
                          aria-label={label}
                          className={cn(
                            className,
                            'cursor-pointer outline-none hover:ring-2 hover:ring-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50'
                          )}
                          onClick={() => onPick(day)}
                        >
                          {number}
                        </button>
                      ) : (
                        <span key={day.date} title={name ?? undefined} className={className}>
                          <span aria-hidden>{number}</span>
                          <span className='sr-only'>{label}</span>
                        </span>
                      )
                    })}
                  </div>
                  {named.length ? (
                    <ul className='flex flex-col gap-0.5 text-xs'>
                      {named.map(day => (
                        <li key={day.date} className='flex gap-2'>
                          <span className='w-12 shrink-0 text-muted-foreground tabular-nums'>
                            {SHORT_DAY.format(utcOf(day.date))}
                          </span>
                          <span
                            className={cn(
                              'truncate',
                              day.holiday ? 'text-destructive' : 'text-primary'
                            )}
                          >
                            {nameOf(day)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              )
            })
          : Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className='h-64' />)}
      </div>
    </div>
  )
}
