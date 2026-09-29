import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from 'cn'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'

interface DatePickerProps {
  id?: string
  value: Date
  /** The last month the dropdowns offer; react-day-picker stops at this year otherwise. */
  endMonth?: Date
  onChange: (date: Date) => void
  format?: (date: Date) => string
  className?: string
}

const defaultFormat = (date: Date) => date.toLocaleDateString()

export const DatePicker = ({
  id,
  value,
  endMonth,
  onChange,
  format = defaultFormat,
  className
}: DatePickerProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button id={id} variant='outline' className={cn('justify-between', className)}>
            {format(value)}
            <CalendarIcon data-icon='inline-end' />
          </Button>
        }
      />
      <PopoverContent align='start' className='w-auto'>
        <Calendar
          mode='single'
          required
          selected={value}
          defaultMonth={value}
          endMonth={endMonth}
          captionLayout='dropdown'
          onSelect={next => {
            if (!next) return
            onChange(next)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
