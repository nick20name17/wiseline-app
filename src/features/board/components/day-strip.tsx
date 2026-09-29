import { dayLoad, loadUnit } from '../lib/format'
import { useBoard } from '../lib/board-context'
import { formatDayLabel, today } from '@/lib/days'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { CalendarDays, X } from 'lucide-react'
import { useState } from 'react'
import { dayStripQuery, WORK_WEEK_DAYS, workWeekQuery, type DayStripEntry } from '../api'
import { ScheduleDialog } from './schedule-dialog'

// One box for every card in the strip, placeholders included: equal widths are what stop the strip
// re-wrapping — and the page below it moving — when the days arrive.
const TILE = 'h-11 w-40 rounded-md border px-2 py-1 leading-tight'

type DayPillProps = {
  entry: DayStripEntry
  isToday: boolean
}

/**
 * One day and what is already on it. The pills answer «how full is this week» while somebody decides
 * what to schedule, and nothing more — they are not a selector, and the board does not make them one.
 */
const DayPill = ({ entry, isToday }: DayPillProps) => {
  const board = useBoard()
  return (
    <div
      className={cn(TILE, 'border-border bg-muted/40', isToday && 'border-primary bg-primary/10')}
      title={`${formatDayLabel(entry.date)} — ${loadUnit(board)} scheduled${board.assignsMachines ? ' against the daily capacity' : ''}`}
    >
      <DayFigures entry={entry} isToday={isToday} />
    </div>
  )
}

const DayFigures = ({ entry, isToday }: DayPillProps) => {
  const board = useBoard()
  return (
    <>
      <span className='block truncate text-xs font-semibold'>
        {formatDayLabel(entry.date)}
        {isToday ? ' · today' : ''}
      </span>
      <span
        className={cn(
          'mt-0.5 block font-mono text-xs text-muted-foreground',
          entry.over_capacity && 'text-destructive'
        )}
      >
        ({dayLoad(entry, board)})
      </span>
    </>
  )
}

type PinnedDayProps = {
  entry: DayStripEntry
  onChange: () => void
  onRemove: () => void
}

/** The day pinned beside the five: clicking it picks another in its place, the cross takes it off. */
const PinnedDay = ({ entry, onChange, onRemove }: PinnedDayProps) => (
  <div className='relative'>
    <button
      type='button'
      className={cn(
        TILE,
        'block border-dashed border-border bg-muted/40 pr-6 text-left transition-colors hover:bg-muted'
      )}
      title={`${formatDayLabel(entry.date)} — click to show another day`}
      onClick={onChange}
    >
      <DayFigures entry={entry} isToday={false} />
    </button>
    <Button
      variant='ghost'
      size='icon-sm'
      aria-label='Remove this day'
      className='absolute top-0.5 right-0.5 size-4'
      onClick={onRemove}
    >
      <X className='size-3' />
    </Button>
  </div>
)

type DayStripProps = {
  departmentId: number | undefined
}

export const DayStrip = ({ departmentId }: DayStripProps) => {
  const board = useBoard()
  const start = today()
  const [peek, setPeek] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data: days, isPending } = useQuery(workWeekQuery(departmentId, start))
  // The pinned day is its own one-day strip: it is usually outside the window the five pills cover.
  const { data: peekDays, isFetching: peekLoading } = useQuery({
    ...dayStripQuery(departmentId, peek ?? start, 1),
    enabled: departmentId !== undefined && peek !== null
  })
  const peekEntry = peek && peekDays?.[0]?.date === peek ? peekDays[0] : null
  const stripDays = new Set(days?.map(entry => entry.date))

  return (
    // `items-stretch`: the day picker is as tall as the pills beside it, as it is on the board.
    <div className='flex flex-wrap items-stretch gap-1.5'>
      {isPending
        ? Array.from({ length: WORK_WEEK_DAYS }, (_, index) => (
            <Skeleton key={index} className='h-11 w-40' />
          ))
        : days?.map(entry => (
            <DayPill key={entry.date} entry={entry} isToday={entry.date === start} />
          ))}

      {/* One box for a day off the strip: the picker until a day is pinned, then that day, which is
          clicked to pick another. Either is a box in the strip, the same height and width. */}
      {/* A pinned day whose figures did not come back falls back to the picker, never a placeholder
          that stays. */}
      {peek === null || (!peekEntry && !peekLoading) ? (
        <Button variant='dashed' className='h-11 w-40' onClick={() => setPickerOpen(true)}>
          <CalendarDays data-icon='inline-start' />
          Pick a day
        </Button>
      ) : peekEntry ? (
        <PinnedDay
          entry={peekEntry}
          onChange={() => setPickerOpen(true)}
          onRemove={() => setPeek(null)}
        />
      ) : (
        <Skeleton className='h-11 w-40' />
      )}

      {/* The same calendar scheduling goes through — the board opens one modal for both. Any day may
          be pinned, one already past or the shop was shut on included: that is often the point of
          looking. */}
      <ScheduleDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title='Show another day'
        description={`Pin any day beside the five work days to see the ${loadUnit(board)} already scheduled to it.`}
        actionLabel='Show day'
        departmentId={departmentId}
        anyDay
        initialDay={peek}
        isPending={false}
        onPick={date => {
          // A day the strip already shows needs no pin of its own.
          setPeek(stripDays.has(date) ? null : date)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
