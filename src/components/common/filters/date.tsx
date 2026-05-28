import { format, parseISO } from 'date-fns'
import * as z from 'zod/mini'

import { DatePicker } from '@/components/ui/date-picker'
import { DATE_FORMAT } from '@/constants/date'
import { useSearchParams } from '@/hooks/use-search-params'
import { cn } from '@/lib/utils'

export const DEFAULT_DATE_VALUE = new Date().toISOString().split('T')[0]
export const DateParamSchema = z.catch(z.optional(z.string()), DEFAULT_DATE_VALUE)

interface DateFilterProps {
  className?: string
  align?: 'center' | 'start' | 'end'
  showArrows?: boolean
}
export const DateFilter = ({ className, align = 'start', showArrows = false }: DateFilterProps) => {
  const [{ date = DEFAULT_DATE_VALUE }, setSearchParams] = useSearchParams()

  const selectedDate = date ? parseISO(date) : new Date()

  return (
    <DatePicker
      className={cn('h-9 w-40', className)}
      showArrows={showArrows}
      align={align}
      date={selectedDate}
      setDate={(date) => {
        setSearchParams({
          date: date ? format(date, DATE_FORMAT.iso) : undefined,
          load: undefined
        })
      }}
    />
  )
}
