import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueries, useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { CalendarDays, Settings2, TriangleAlert } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { dayStripQuery, overdueQuery } from '../api'
import { formatDate, today } from '../lib/format'
import { ScheduleDialog } from './schedule-dialog'

// Today plus the rest of the working week, so the strip does not change shape as work is scheduled.
export const WINDOW_DAYS = 5

// Every card in the strip is the same box. Equal widths are what keep the rows from re-wrapping —
// and the strip from changing height — when the placeholders are replaced by the days themselves.
const TILE = 'relative h-13 w-44 rounded-md border border-border px-3 py-1 text-left leading-tight'

type ScheduledDayTabsProps = {
  departmentId: number | undefined
  /** `null` is the board's «All Scheduled Orders». */
  day: string | null
  total: number
  onDayChange: (day: string | null) => void
  onOpenCapacities: (day: string) => void
}

/**
 * The day tabs: a rolling window that shows even when a day is empty, with the days carrying overdue
 * work pinned before today and a day picked from the calendar joining them — so a jump always has a
 * tab to land on.
 */
export const ScheduledDayTabs = ({
  departmentId,
  day,
  total,
  onDayChange,
  onOpenCapacities
}: ScheduledDayTabsProps) => {
  const start = today()
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data: window, isPending } = useQuery(dayStripQuery(departmentId, start, WINDOW_DAYS))
  const { data: overdue } = useQuery(overdueQuery(departmentId))

  const inWindow = new Set(window?.map(entry => entry.date))
  const overdueDays = new Set(overdue?.days)
  const anyOverdue = overdueDays.size > 0

  // Each day outside the window — every overdue one, and the one picked from the calendar — is its
  // own one-day strip, since the days in between are not tabs.
  const extra = [...new Set([...overdueDays, ...(day ? [day] : [])])].filter(
    iso => !inWindow.has(iso)
  )
  const extraDays = useQueries({
    queries: extra.map(iso => dayStripQuery(departmentId, iso, 1)),
    combine: results => results.flatMap(result => result.data ?? [])
  })

  const days = [...(window ?? []), ...extraDays].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className='flex flex-wrap items-stretch gap-1.5'>
      <button
        type='button'
        className={cn(
          TILE,
          'bg-background hover:border-input',
          day === null && 'border-primary bg-primary/10'
        )}
        onClick={() => onDayChange(null)}
      >
        <span className='block text-xs font-semibold'>All Scheduled Orders</span>
        <span className='mt-0.5 block font-mono text-xs text-muted-foreground'>
          {total} order{total === 1 ? '' : 's'}
        </span>
      </button>

      {/* The jump sits between «all» and the days, and reads as the day it would take you back to. */}
      {/* The label is set in the strip's own size rather than the button's, so the control reads as
          one of the cards beside it. */}
      {/* Red while any day carries overdue work, tab on the strip or not (p1 (293,540), (326,569)). */}
      <Button
        variant='outline'
        className='h-13 w-44'
        title={
          anyOverdue
            ? 'Jump to a production day — some days have overdue orders'
            : 'Jump to a production day'
        }
        onClick={() => setPickerOpen(true)}
      >
        {/* The Button owns its colours, so the red goes on what it holds. */}
        <span className={cn('inline-flex items-center gap-2', anyOverdue && 'text-destructive')}>
          {anyOverdue ? <TriangleAlert /> : <CalendarDays />}
          <span className='text-xs font-semibold'>{day ? formatDate(day) : 'Pick a day'}</span>
        </span>
      </Button>

      {isPending
        ? Array.from({ length: WINDOW_DAYS }, (_, index) => (
            <Skeleton key={index} className='h-13 w-44' />
          ))
        : days.map(entry => {
            const isOverdue = overdueDays.has(entry.date)
            const warn = isOverdue || entry.over_capacity
            const active = entry.date === day
            const used =
              entry.capacity && entry.capacity > 0
                ? Math.min(100, Math.round((entry.bends / entry.capacity) * 100))
                : 0

            return (
              <div key={entry.date} className='relative'>
                <button
                  type='button'
                  className={cn(
                    TILE,
                    // The gear overlays the top-right corner, so the text stops short of it.
                    'bg-background pr-9 whitespace-nowrap hover:border-input',
                    active && 'border-primary bg-primary/10',
                    warn && 'border-destructive bg-destructive/5'
                  )}
                  onClick={() => onDayChange(entry.date)}
                >
                  <span className='flex items-center gap-1 text-xs font-semibold'>
                    {formatDate(entry.date)}
                    {warn ? <TriangleAlert className='size-3.5 text-destructive' /> : null}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block font-mono text-xs text-muted-foreground',
                      active && 'text-primary',
                      entry.over_capacity && 'text-destructive'
                    )}
                    title={
                      entry.over_capacity
                        ? 'Over capacity — soft warning'
                        : 'Assigned bends / total plant daily bend capacity'
                    }
                  >
                    ({entry.bends} / {entry.capacity ?? '—'}){entry.over_capacity ? ' · over' : ''}
                  </span>
                  <span className='mt-1 block h-1 w-full overflow-hidden rounded-full bg-border'>
                    <span
                      className={cn(
                        'block h-full w-(--used)',
                        warn ? 'bg-destructive' : 'bg-primary'
                      )}
                      style={{ '--used': `${used}%` } as CSSProperties}
                    />
                  </span>
                </button>
                <span className='absolute top-1/2 right-1.5 -translate-y-1/2'>
                  <Button
                    variant='outline'
                    size='icon-sm'
                    aria-label={`Machine capacities for ${formatDate(entry.date)}`}
                    title='Machine Capacities report for this day'
                    onClick={() => onOpenCapacities(entry.date)}
                  >
                    <Settings2 />
                  </Button>
                </span>
              </div>
            )
          })}

      <ScheduleDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title='Jump to a day'
        description='Focus the board on a production day.'
        actionLabel='Go to day'
        departmentId={departmentId}
        allowPast
        initialDay={day}
        isPending={false}
        onPick={date => {
          onDayChange(date)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
