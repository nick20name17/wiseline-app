import { RiArrowLeftSLine, RiArrowRightSLine, RiCalendar2Line } from '@remixicon/react'
import { addDays, format, subDays } from 'date-fns'
import { useState } from 'react'
import { type Matcher } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DATE_FORMAT } from '@/constants/date'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  className?: string
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  disabledDays?: Matcher | Matcher[]
  align?: 'center' | 'start' | 'end'
  showArrows?: boolean
  disabled?: boolean
}

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6

const shiftDate = (
  date: Date | undefined,
  direction: 'prev' | 'next',
  includeWeekends: boolean
): Date | undefined => {
  if (!date) return undefined

  const step = direction === 'prev' ? subDays : addDays

  const nextValid = (current: Date): Date => {
    const next = step(current, 1)
    return !includeWeekends && isWeekend(next) ? nextValid(next) : next
  }

  return nextValid(date)
}

export const DatePicker = ({
  className,
  disabledDays,
  date,
  setDate,
  align = 'start',
  showArrows = false,
  disabled = false
}: DatePickerProps) => {
  const includeWeekends = false
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date)

  const handleCancel = () => {
    setSelectedDate(date)
    setOpen(false)
  }

  const handleSetProductionDate = () => {
    setDate(selectedDate)
    setOpen(false)
  }

  const onPreviousDay = () => {
    const newDate = shiftDate(date, 'prev', includeWeekends)

    setDate(newDate)
    setSelectedDate(newDate)
  }

  const onNextDay = () => {
    const newDate = shiftDate(date, 'next', includeWeekends)

    setDate(newDate)
    setSelectedDate(newDate)
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      {showArrows ? (
        <div className='flex items-center gap-1.5'>
          <Button
            disabled={disabled}
            size='icon'
            variant='outline'
            onClick={onPreviousDay}
          >
            <RiArrowLeftSLine />
          </Button>

          <PopoverTrigger asChild>
            <Button
              size='sm'
              variant='outline'
              id='date'
              disabled={disabled}
              className={cn(
                'text-muted-foreground flex items-center justify-start gap-2',
                className
              )}
            >
              <RiCalendar2Line />
              {date ? (
                <span className={disabled ? 'text-muted-foreground' : 'text-foreground'}>
                  {format(date, DATE_FORMAT.weekdayShort)}
                </span>
              ) : (
                <span>Choose date</span>
              )}
            </Button>
          </PopoverTrigger>
          <Button
            disabled={disabled}
            size='icon'
            variant='outline'
            onClick={onNextDay}
          >
            <RiArrowRightSLine />
          </Button>
        </div>
      ) : (
        <PopoverTrigger asChild>
          <Button
            size='sm'
            variant='outline'
            id='date'
            disabled={disabled}
            className={cn('text-muted-foreground flex items-center justify-start gap-2', className)}
          >
            <RiCalendar2Line />
            {date ? (
              <span className={disabled ? 'text-muted-foreground' : 'text-foreground'}>
                {format(date, DATE_FORMAT.weekdayShort)}
              </span>
            ) : (
              <span>Choose date</span>
            )}
          </Button>
        </PopoverTrigger>
      )}

      <PopoverContent
        className='w-auto p-3'
        align={showArrows ? 'center' : align}
      >
        <Calendar
          mode='single'
          disabled={
            disabledDays || {
              dayOfWeek: includeWeekends ? [] : [0, 6]
            }
          }
          selected={selectedDate}
          onSelect={setSelectedDate}
        />

        <div className='mt-3 flex items-center gap-2'>
          <Button
            onClick={handleCancel}
            variant='outline'
            className='flex-1'
            size='sm'
          >
            Cancel
          </Button>
          <Button
            disabled={!selectedDate}
            className='flex-1'
            size='sm'
            onClick={handleSetProductionDate}
          >
            Set date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
