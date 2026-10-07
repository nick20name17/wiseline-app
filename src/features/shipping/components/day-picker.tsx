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
  const { data: overdue = [] } = useQuery({ ...overdueDaysQuery, enabled: markOverdue })
  const step = (days: number) => onDayChange(toIsoDay(addDays(fromIsoDay(day), days)))
  const late = overdue.includes(day)
  const shortcuts = overdue.slice(-SHOWN_OVERDUE)

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button variant='outline' size='icon' aria-label='Previous day' onClick={() => step(-1)}>
        <ChevronLeft />
      </Button>
      <DatePicker
        value={fromIsoDay(day)}
        onChange={date => onDayChange(toIsoDay(date))}
        format={date => formatLongDate(toIsoDay(date))}
        flagged={overdue.map(fromIsoDay)}
      />
      <Button variant='outline' size='icon' aria-label='Next day' onClick={() => step(1)}>
        <ChevronRight />
      </Button>
      {late ? <Badge variant='destructive'>Overdue</Badge> : null}
      {shortcuts.length ? (
        <span className='ml-2 flex flex-wrap items-center gap-1.5 text-sm'>
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
