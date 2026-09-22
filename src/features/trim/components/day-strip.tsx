import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { CalendarDays, X } from 'lucide-react'
import { useState } from 'react'
import { dayStripQuery, type DayStripEntry } from '../api'
import { formatDayLabel, today } from '../lib/format'
import { ScheduleDialog } from './schedule-dialog'

// The board shows the current day plus the rest of the working week.
const STRIP_DAYS = 5

type DayPillProps = {
  entry: DayStripEntry
  isToday: boolean
  onRemove?: () => void
}

/**
 * One day and what is already on it. The pills answer «how full is this week» while somebody decides
 * what to schedule, and nothing more — they are not a selector, and the board does not make them one.
 */
const DayPill = ({ entry, isToday, onRemove }: DayPillProps) => (
  <div
    className={cn(
      'relative min-w-27 rounded-md border border-border bg-muted/40 px-2 py-1 leading-tight',
      isToday && 'border-primary bg-primary/10',
      onRemove && 'border-dashed pr-6'
    )}
    title={`${formatDayLabel(entry.date)} — bends scheduled against the daily capacity`}
  >
    <span className='block text-xs font-semibold'>
      {formatDayLabel(entry.date)}
      {isToday ? ' · today' : ''}
    </span>
    <span
      className={cn(
        'mt-0.5 block font-mono text-xs text-muted-foreground',
        entry.over_capacity && 'text-destructive'
      )}
    >
      ({entry.bends} / {entry.capacity ?? '—'})
    </span>
    {onRemove ? (
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label='Remove this day'
        className='absolute top-0.5 right-0.5 size-4'
        onClick={onRemove}
      >
        <X className='size-3' />
      </Button>
    ) : null}
  </div>
)

type DayStripProps = {
  departmentId: number | undefined
}

export const DayStrip = ({ departmentId }: DayStripProps) => {
  const start = today()
  const [peek, setPeek] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data: days, isPending } = useQuery(dayStripQuery(departmentId, start, STRIP_DAYS))
  // The pinned day is its own one-day strip: it is usually outside the window the five pills cover.
  const { data: peekDays } = useQuery({
    ...dayStripQuery(departmentId, peek ?? start, 1),
    enabled: departmentId !== undefined && peek !== null
  })
  const peekEntry = peek && peekDays?.[0]?.date === peek ? peekDays[0] : null

  return (
    // `items-stretch`: the day picker is as tall as the pills beside it, as it is on the board.
    <div className='flex flex-wrap items-stretch gap-1.5'>
      {isPending
        ? Array.from({ length: STRIP_DAYS }, (_, index) => (
            <Skeleton key={index} className='h-11 w-27' />
          ))
        : days?.map(entry => (
            <DayPill key={entry.date} entry={entry} isToday={entry.date === start} />
          ))}

      {peekEntry && !days?.some(day => day.date === peekEntry.date) ? (
        <DayPill entry={peekEntry} isToday={false} onRemove={() => setPeek(null)} />
      ) : null}

      {/* `h-auto`: the control takes its height from the strip, which is what puts it level with the
          day pills beside it. */}
      <Button variant='dashed' className='h-auto' onClick={() => setPickerOpen(true)}>
        <CalendarDays data-icon='inline-start' />
        {peek ? 'Another day' : 'Pick a day'}
      </Button>

      {/* The same calendar scheduling goes through — the board opens one modal for both. Any day may
          be pinned, including one already past: that is often the point of looking. */}
      <ScheduleDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title='Show another day'
        description='Pin any day beside the five work days to see the bends already scheduled to it.'
        actionLabel='Show day'
        departmentId={departmentId}
        allowPast
        isPending={false}
        onPick={date => {
          setPeek(date)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
