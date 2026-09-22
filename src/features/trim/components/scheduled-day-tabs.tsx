import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { CalendarDays, Settings2, TriangleAlert } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { dayStripQuery, overdueQuery } from '../api'
import { formatDate, today } from '../lib/format'
import { ScheduleDialog } from './schedule-dialog'

// Today plus the rest of the working week, so the strip does not change shape as work is scheduled.
const WINDOW_DAYS = 5

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

  // A day outside the window — overdue, or picked from the calendar — is its own one-day strip.
  const extra = [...(overdue?.days ?? []), ...(day ? [day] : [])].filter(
    iso => !window?.some(entry => entry.date === iso)
  )
  const { data: extraDays } = useQuery({
    ...dayStripQuery(departmentId, extra[0] ?? start, 1),
    enabled: departmentId !== undefined && extra.length > 0
  })

  const days = [...(window ?? []), ...(extraDays ?? []).filter(entry => extra.includes(entry.date))]
    .filter((entry, index, all) => all.findIndex(other => other.date === entry.date) === index)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className='flex flex-wrap items-stretch gap-1.5'>
      <button
        type='button'
        className={cn(
          'rounded-md border border-border bg-muted/40 px-3 py-1 text-left leading-tight',
          day === null && 'border-primary bg-primary/10'
        )}
        onClick={() => onDayChange(null)}
      >
        <span className='block text-xs font-semibold'>All Scheduled Orders</span>
        <span className='mt-0.5 block font-mono text-xs text-muted-foreground'>
          {total} order{total === 1 ? '' : 's'}
        </span>
      </button>

      {isPending
        ? Array.from({ length: WINDOW_DAYS }, (_, index) => (
            <Skeleton key={index} className='h-13 w-44' />
          ))
        : days.map(entry => {
            const isOverdue = overdue?.days.includes(entry.date) ?? false
            const warn = isOverdue || entry.over_capacity
            const used =
              entry.capacity && entry.capacity > 0
                ? Math.min(100, Math.round((entry.bends / entry.capacity) * 100))
                : 0

            return (
              <div key={entry.date} className='relative'>
                <button
                  type='button'
                  className={cn(
                    'h-full w-44 rounded-md border border-border bg-muted/40 px-3 py-1 pr-8 text-left leading-tight',
                    entry.date === day && 'border-primary bg-primary/10',
                    warn && 'border-destructive'
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
                      entry.over_capacity && 'text-destructive'
                    )}
                    title={
                      entry.over_capacity
                        ? 'Over capacity — a warning, never a block'
                        : 'Assigned bends against the daily capacity'
                    }
                  >
                    ({entry.bends} / {entry.capacity ?? '—'}){entry.over_capacity ? ' · over' : ''}
                  </span>
                  {/* How full the day is, at a glance. The plant decides whether to go over, not the tab. */}
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
                <Button
                  variant='ghost'
                  size='icon-sm'
                  className='absolute top-1 right-1'
                  aria-label={`Machine capacities for ${formatDate(entry.date)}`}
                  onClick={() => onOpenCapacities(entry.date)}
                >
                  <Settings2 />
                </Button>
              </div>
            )
          })}

      <Button variant='dashed' className='h-auto' onClick={() => setPickerOpen(true)}>
        <CalendarDays data-icon='inline-start' />
        {day ? 'Another day' : 'Pick a day'}
      </Button>

      <ScheduleDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title='Jump to a day'
        description='Focus the board on one production day.'
        actionLabel='Go to day'
        departmentId={departmentId}
        allowPast
        isPending={false}
        onPick={picked => {
          onDayChange(picked)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
