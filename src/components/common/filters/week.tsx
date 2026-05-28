import { addDays, format, parseISO, startOfWeek } from 'date-fns'

import { DEFAULT_DATE_VALUE } from './date'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DATE_FORMAT } from '@/constants/date'
import { useSearchParams } from '@/hooks/use-search-params'

export const WeekFilter = () => {
  const includeWeekends = false

  const [{ date = DEFAULT_DATE_VALUE }, setSearchParams] = useSearchParams()

  const referenceDate = date ? parseISO(date) : new Date()

  const start = startOfWeek(referenceDate, { weekStartsOn: 1 })

  const daysCount = includeWeekends ? 7 : 5

  const days = Array.from({ length: daysCount }, (_, i) => addDays(start, i))

  const handleWeekChange = (value: string) => {
    setSearchParams({ date: value })
  }

  return (
    <Tabs
      value={date ?? format(referenceDate, DATE_FORMAT.iso)}
      onValueChange={handleWeekChange}
    >
      <TabsList>
        {days.map((day) => {
          const value = format(day, DATE_FORMAT.iso)
          const label = format(day, DATE_FORMAT.dayShort)
          return (
            <TabsTrigger
              key={value}
              value={value}
            >
              {label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
