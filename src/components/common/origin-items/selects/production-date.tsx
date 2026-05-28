import { format, parseISO } from 'date-fns'
import { useState } from 'react'

import { useUpsertItem } from '@/api/items/query'
import type { OriginItem } from '@/api/origin-items/schema'
import { DatePicker } from '@/components/ui/date-picker'
import { DATE_FORMAT } from '@/constants/date'

interface OriginItemProductionDateSelectProps {
  originItem: OriginItem
  className?: string
  readonly?: boolean
}

export const OriginItemProductionDateSelect = ({
  originItem,
  className,
  readonly
}: OriginItemProductionDateSelectProps) => {
  const initialDate = originItem?.item?.production_date
    ? parseISO(originItem.item.production_date)
    : undefined

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate)

  const { handleUpsertItem } = useUpsertItem({
    onError: () => {
      setSelectedDate(initialDate)
    }
  })

  const handleSetProductionDate = (date: Date | undefined) => {
    setSelectedDate(date)

    if (date) {
      handleUpsertItem({
        id: originItem?.item?.id,
        payload: {
          production_date: format(date, DATE_FORMAT.iso),
          origin_item: originItem.id,
          order: originItem.origin_order
        }
      })
    }
  }

  if (
    readonly ||
    originItem?.item?.status === 'wrapped' ||
    originItem?.item?.status === 'shipped'
  ) {
    return initialDate ? format(initialDate, DATE_FORMAT.weekdayShort) : '—'
  }

  return (
    <DatePicker
      date={selectedDate}
      className={className}
      setDate={handleSetProductionDate}
    />
  )
}
