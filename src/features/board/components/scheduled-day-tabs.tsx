import { dayLoad, loadUnit } from '../lib/format'
import { useBoard } from '../lib/board-context'
import { formatDate, today } from '@/lib/days'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { CalendarDays, Settings2, TriangleAlert } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import {
  dayStripDatesQuery,
  dayStripQuery,
  overdueQuery,
  WORK_WEEK_DAYS,
  workWeekQuery
} from '../api'
import { ScheduleDialog } from './schedule-dialog'

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
  const board = useBoard()
  const start = today()
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data: window, isPending } = useQuery(workWeekQuery(departmentId, start))
  const { data: overdue } = useQuery(overdueQuery(departmentId))

  const inWindow = new Set(window?.map(entry => entry.date))
  const overdueDays = new Set(overdue?.days)
  const anyOverdue = overdueDays.size > 0

  // The days outside the window are tabs of their own, since the days in between are not. The overdue
  // ones rarely change, so they are one request by date (sorted: the same days, the same query); the
  // day picked from the calendar is its own, so picking another does not ask for them all again.
  // Both wait for the window, which is what says whether a day is outside it.
  const late = [...overdueDays].filter(iso => !inWindow.has(iso)).sort()
  const { data: lateDays } = useQuery({
    ...dayStripDatesQuery(departmentId, late),
    enabled: !!window && departmentId !== undefined && late.length > 0
  })
  const picked = day && !inWindow.has(day) && !overdueDays.has(day) ? day : null
  const { data: pickedDay } = useQuery({
    ...dayStripQuery(departmentId, picked ?? start, 1),
    enabled: !!window && departmentId !== undefined && picked !== null
  })

  const days = [...(window ?? []), ...(lateDays ?? []), ...(picked ? (pickedDay ?? []) : [])].sort(
    (a, b) => a.date.localeCompare(b.date)
  )

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

      {/* The jump sits between «all» and the days. It does not name the day picked: that day is a tab
          of its own, already marked. The label is set in the strip's own size rather than the
          button's, so the control reads as one of the cards beside it. */}
      {/* Red while any day carries overdue work, tab on the strip or not (p1 (293,540), (326,569)). */}
      <Button
        variant='outline'
        className='h-13 w-44'
        title={
          anyOverdue
            ? `Jump to a ${board.dayWord} — some days have overdue orders`
            : `Jump to a ${board.dayWord}`
        }
        onClick={() => setPickerOpen(true)}
      >
        {/* The Button owns its colours, so the red goes on what it holds. */}
        <span className={cn('inline-flex items-center gap-2', anyOverdue && 'text-destructive')}>
          {anyOverdue ? <TriangleAlert /> : <CalendarDays />}
          <span className='text-xs font-semibold'>Pick a day</span>
        </span>
      </Button>

      {isPending
        ? Array.from({ length: WORK_WEEK_DAYS }, (_, index) => (
            <Skeleton key={index} className='h-13 w-44' />
          ))
        : days.map(entry => {
            const isOverdue = overdueDays.has(entry.date)
            const warn = isOverdue || entry.over_capacity
            const active = entry.date === day
            const used =
              entry.capacity && entry.capacity > 0
                ? Math.min(100, Math.round((entry.used / entry.capacity) * 100))
                : 0

            return (
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
                        ? 'Over capacity — soft warning'
                        : entry.capacity === null
                          ? `Assigned to the day, in ${loadUnit(entry.capacity_unit)}`
                          : `Assigned ${loadUnit(entry.capacity_unit)} / the day's capacity`
                    }
                  >
                    ({dayLoad(entry)})
                    {/* Not printed: four-digit loads already fill the tile. Said for a screen reader,
                        since the red and the triangle mean overdue too. */}
                    {entry.over_capacity ? <span className='sr-only'> · over capacity</span> : null}
                  </span>
                  {/* A share of the day's capacity, where the department has set one. */}
                  {entry.capacity ? (
                    <span className='mt-1 block h-1 w-full overflow-hidden rounded-full bg-border'>
                      <span
                        className={cn(
                          'block h-full w-(--used)',
                          warn ? 'bg-destructive' : 'bg-primary'
                        )}
                        style={{ '--used': `${used}%` } as CSSProperties}
                      />
                    </span>
                  ) : null}
                </button>
                {/* Only on the day being pointed at, so a row of days reads as dates, not buttons;
                    a keyboard reaching it shows it too. A board with no machines has no report. */}
                {board.makes ? (
                  <span className='absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 transition-opacity group-hover/day:opacity-100 focus-within:opacity-100'>
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
                ) : null}
              </div>
            )
          })}

      <ScheduleDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title='Jump to a day'
        description={`Focus the board on a ${board.dayWord}.`}
        actionLabel='Go to day'
        departmentId={departmentId}
        anyDay
        isPending={false}
        onPick={date => {
          onDayChange(date)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
