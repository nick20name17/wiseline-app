import { dayLoadHint, dayUsed } from '../lib/format'
import { toIsoDay, today } from '@/lib/days'
import { Calendar } from '@/components/ui/calendar'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { getDaysInMonth, startOfMonth } from 'date-fns'
import type { CSSProperties } from 'react'
import { dayStripQuery, overdueQuery } from '../api'

type CapacityCalendarProps = {
  departmentId: number | undefined
  month: Date
  onMonthChange: (month: Date) => void
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  /** Scheduling cannot reach into the past or onto a day the shop is shut; looking at a day can. */
  anyDay?: boolean
}

/**
 * The month grid with each day's load under its number, in the department's unit, red once it is past
 * the daily capacity. The capacity itself stays in the hint and on the day pills: «1033 / 1000 ft» does
 * not fit a cell.
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
  anyDay = false
}: CapacityCalendarProps) => {
  const { data: strip } = useQuery(
    dayStripQuery(departmentId, toIsoDay(startOfMonth(month)), getDaysInMonth(month))
  )
  const budgets = new Map(strip?.map(entry => [entry.date, entry]))
  // A day the server has no word on yet is open.
  const closed = (iso: string) => budgets.get(iso)?.is_work_day === false
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
      disabled={date => {
        const iso = toIsoDay(date)
        return !anyDay && (iso < today() || closed(iso))
      }}
      components={{
        // A plain button, not the shared one: the cell carries two lines — the date and the day's
        // budget — which no button size describes.
        DayButton: ({ day, modifiers, className, children, ...props }) => {
          const iso = toIsoDay(day.date)
          const budget = budgets.get(iso)
          const load = budget ? dayLoadHint(budget) : undefined
          const past = !anyDay && iso < today()
          const late = overdueDays.has(iso)
          const hint = [
            late ? 'Overdue orders' : null,
            past ? 'Past date' : null,
            closed(iso) ? (budget?.holiday ?? 'Not a work day') : null,
            load
          ]
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
                {budget ? dayUsed(budget) : ''}
              </span>
            </button>
          )
        }
      }}
    />
  )
}
