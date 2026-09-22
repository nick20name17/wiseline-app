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

// Every card in the strip is the same box. Equal widths are what keep the rows from re-wrapping —
// and the strip from changing height — when the placeholders are replaced by the days themselves.
const TILE = 'h-15 w-48 rounded-md border border-border px-3 py-1.5 text-left leading-tight'

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
      <Button variant='outline' className='h-15 w-48' onClick={() => setPickerOpen(true)}>
        <CalendarDays data-icon='inline-start' />
        {day ? formatDate(day) : 'Pick a day'}
      </Button>

      {isPending
        ? Array.from({ length: WINDOW_DAYS }, (_, index) => (
            <Skeleton key={index} className='h-15 w-48' />
          ))
        : days.map(entry => {
            const isOverdue = overdue?.days.includes(entry.date) ?? false
            const warn = isOverdue || entry.over_capacity
            const active = entry.date === day
            const used =
              entry.capacity && entry.capacity > 0
                ? Math.min(100, Math.round((entry.bends / entry.capacity) * 100))
                : 0

            return (
              // The gear only shows on the day being worked, or on the one under the pointer — it is
              // a way into that day's detail, not a badge every tab has to carry.
              <div key={entry.date} className='group/day relative'>
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
                        ? 'Over capacity — a warning, never a block'
                        : 'Assigned bends against the daily capacity'
                    }
                  >
                    ({entry.bends} / {entry.capacity ?? '—'}){entry.over_capacity ? ' · over' : ''}
                  </span>
                  <span className='mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-border'>
                    <span
                      className={cn(
                        'block h-full w-(--used)',
                        warn ? 'bg-destructive' : 'bg-primary'
                      )}
                      style={{ '--used': `${used}%` } as CSSProperties}
                    />
                  </span>
                </button>
                <span
                  className={cn(
                    'absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 transition-opacity group-hover/day:opacity-100 has-[button:focus-visible]:opacity-100',
                    active && 'opacity-100'
                  )}
                >
                  <Button
                    variant='outline'
                    size='icon-sm'
                    aria-label={`Machine capacities for ${formatDate(entry.date)}`}
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
