import { format } from 'date-fns'
import { useState } from 'react'

import type { Order } from '@/api/orders/schema'
import { useUpsertSalesOrder } from '@/api/sales-orders/query'
import { DatePicker } from '@/components/ui/date-picker'
import { DATE_FORMAT } from '@/constants/date'
import { cn } from '@/lib/utils'

interface ProductionDateSelectProps {
  order: Order
  className?: string
  readonly?: boolean
}

export const OrderProductionDateSelect = ({
  order,
  className,
  readonly
}: ProductionDateSelectProps) => {
  const initialDate = order?.sales_order?.production_date
    ? new Date(order?.sales_order?.production_date)
    : undefined

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate)

  const { handleUpsertSalesOrders } = useUpsertSalesOrder({
    onError: () => {
      setSelectedDate(initialDate)
    }
  })

  const handleSetProductionDate = (date: Date | undefined) => {
    setSelectedDate(date)

    if (date) {
      handleUpsertSalesOrders([
        {
          id: order.sales_order?.id,
          payload: {
            production_date: format(date, DATE_FORMAT.iso),
            order: order.id
          }
        }
      ])
    }
  }

  if (readonly) {
    return initialDate ? format(initialDate, DATE_FORMAT.weekdayShort) : '—'
  }

  return (
    <DatePicker
      date={selectedDate}
      className={cn('bg-transparent', className)}
      setDate={handleSetProductionDate}
      disabled={order.sales_order?.status === 'wrapped'}
    />
  )
}
