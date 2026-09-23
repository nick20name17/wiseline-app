import { Calendar } from '@/components/ui/calendar'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import type { CSSProperties } from 'react'
import { dayStripQuery, overdueQuery } from '../api'
import { toIsoDay, today } from '../lib/format'

const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

type CapacityCalendarProps = {
  departmentId: number | undefined
  month: Date
  onMonthChange: (month: Date) => void
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  /** Scheduling cannot reach into the past; looking at a day can. */
  allowPast?: boolean
}

/**
 * The month grid with each day's budget under its number — bends already scheduled against the
 * department's daily capacity.
 *
 * Every scheduling decision goes through it, because the question is never «which date» on its own,
 * it is «which date has room». One component for the dialog and for the day strip's day picker, so
 * the two cannot drift.
 */
export const CapacityCalendar = ({
  departmentId,
  month,
  onMonthChange,
  selected,
  onSelect,
  allowPast = false
}: CapacityCalendarProps) => {
  const { data: strip } = useQuery(
    dayStripQuery(departmentId, toIsoDay(firstOfMonth(month)), daysInMonth(month))
  )
  const budgets = new Map(strip?.map(entry => [entry.date, entry]))
  const { data: overdue } = useQuery(overdueQuery(departmentId))
  const overdueDays = new Set(overdue?.days)

  return (
    <Calendar
      mode='single'
      className='w-full'
      // The cell has to hold two lines, so it is bigger than the sheet's default; an inline custom
      // property is the only thing that outranks the class the component sets it with.
      style={{ '--cell-size': 'calc(var(--spacing) * 12)' } as CSSProperties}
      month={month}
      onMonthChange={onMonthChange}
      selected={selected}
      onSelect={onSelect}
      disabled={date => !allowPast && toIsoDay(date) < today()}
      components={{
        // A plain button, not the shared one: the cell carries two lines — the date and the day's
        // budget — which no button size describes.
        DayButton: ({ day, modifiers, className, children, ...props }) => {
          const iso = toIsoDay(day.date)
          const budget = budgets.get(iso)
          const load = budget
            ? `${budget.bends}${budget.capacity === null ? '' : ` of ${budget.capacity}`} bends scheduled${budget.over_capacity ? ' — over the daily capacity' : ''}`
            : undefined
          const past = !allowPast && iso < today()
          const late = overdueDays.has(iso)
          const hint = [late ? 'Overdue orders' : null, past ? 'Past date' : null, load]
            .filter(Boolean)
            .join(' · ')

          return (
            <button
              type='button'
              data-day={day.date.toLocaleDateString()}
              title={hint || undefined}
              className={cn(
                'relative flex size-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-md pb-3 text-sm leading-none transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40',
                // "The date that has the overdue order should be highlighted in red" p1 (326,574).
                late && 'bg-destructive/10 text-destructive',
                modifiers.selected && 'bg-primary text-primary-foreground hover:bg-primary',
                className
              )}
              {...props}
            >
              {children}
              {/* Out of the flow on purpose: in the layout the sheet gives a day cell, a four-digit
                  budget would otherwise widen its column and pull the whole grid out of shape. */}
              <span
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-1 truncate text-center font-mono text-xs tracking-tighter',
                  modifiers.selected ? 'text-primary-foreground' : 'text-muted-foreground',
                  budget?.over_capacity && !modifiers.selected && 'text-destructive'
                )}
              >
                {budget ? `${budget.bends} / ${budget.capacity ?? '—'}` : ''}
              </span>
            </button>
          )
        }
      }}
    />
  )
}
