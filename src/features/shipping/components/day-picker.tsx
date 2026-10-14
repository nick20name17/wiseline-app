import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { formatDayLabel, formatLongDate, fromIsoDay, toIsoDay } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { addDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { overdueDaysQuery } from '../api'

// The latest few; a backlog older than that is a clean-up, not the day's work.
const SHOWN_OVERDUE = 5

type DayPickerProps = {
  day: string
  onDayChange: (day: string) => void
  /** Dispatch's picker marks the late days; Loading and the Driver work the day they are given. */
  markOverdue?: boolean
}

/**
 * The day a window works, a step either way or a pick from the calendar. A day with a shipment past
 * its date and not delivered reads red, in the calendar and among the shortcuts beside it p3 (593,591).
 */
export const DayPicker = ({ day, onDayChange, markOverdue = false }: DayPickerProps) => {
  const { data = [] } = useQuery({ ...overdueDaysQuery, enabled: markOverdue })
  // A disabled query still hands back what Dispatch cached.
  const overdue = markOverdue ? data : []
  const step = (days: number) => onDayChange(toIsoDay(addDays(fromIsoDay(day), days)))
  const late = overdue.includes(day)
  // ISO days sort as strings; the server's order is not promised.
  const shortcuts = overdue.toSorted().slice(-SHOWN_OVERDUE)

  return (
    // On a phone the date stretches between its arrows across the row.
    <div className='flex flex-wrap items-center gap-2'>
      <Button variant='outline' size='icon' aria-label='Previous day' onClick={() => step(-1)}>
        <ChevronLeft />
      </Button>
      <DatePicker
        value={fromIsoDay(day)}
        onChange={date => onDayChange(toIsoDay(date))}
        format={date => formatLongDate(toIsoDay(date))}
        flagged={overdue.map(fromIsoDay)}
        className='max-md:flex-1'
      />
      <Button variant='outline' size='icon' aria-label='Next day' onClick={() => step(1)}>
        <ChevronRight />
      </Button>
      {/* The picked shortcut already reads red; a phone would give the badge a line of its own. */}
      {late ? (
        <Badge
          variant='destructive'
          className={shortcuts.includes(day) ? 'max-md:hidden' : undefined}
        >
          Overdue
        </Badge>
      ) : null}
      {shortcuts.length ? (
        // A phone gives the late days their own line rather than a ragged tail of the stepper's.
        <span className='flex flex-wrap items-center gap-1.5 text-sm max-md:basis-full md:ml-2'>
          <span className='text-destructive'>
            Overdue{overdue.length > shortcuts.length ? ` (${overdue.length} days)` : ''}:
          </span>
          {shortcuts.map(iso => (
            <Button
              key={iso}
              variant={iso === day ? 'destructive' : 'outline'}
              size='sm'
              aria-pressed={iso === day}
              onClick={() => onDayChange(iso)}
            >
              {formatDayLabel(iso)}
            </Button>
          ))}
        </span>
      ) : null}
    </div>
  )
}
