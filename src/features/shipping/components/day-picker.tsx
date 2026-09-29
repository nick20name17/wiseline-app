import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { formatLongDate, fromIsoDay, toIsoDay } from '@/lib/days'
import { addDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type DayPickerProps = { day: string; onDayChange: (day: string) => void }

/** The day a window works, a step either way or a pick from the calendar. */
export const DayPicker = ({ day, onDayChange }: DayPickerProps) => {
  const step = (days: number) => onDayChange(toIsoDay(addDays(fromIsoDay(day), days)))
  return (
    <div className='flex items-center gap-2'>
      <Button variant='outline' size='icon' aria-label='Previous day' onClick={() => step(-1)}>
        <ChevronLeft />
      </Button>
      <DatePicker
        value={fromIsoDay(day)}
        onChange={date => onDayChange(toIsoDay(date))}
        format={date => formatLongDate(toIsoDay(date))}
      />
      <Button variant='outline' size='icon' aria-label='Next day' onClick={() => step(1)}>
        <ChevronRight />
      </Button>
    </div>
  )
}
