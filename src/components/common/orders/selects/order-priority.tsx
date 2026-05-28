import { useState } from 'react'

import { BasicPrioritySelect } from '../../selects/basic-priority'

import type { Order } from '@/api/orders/schema'
import { useUpsertSalesOrder } from '@/api/sales-orders/query'

interface OrderPrioritySelectProps {
  className?: string
  order: Order
  readonly?: boolean
}

export const OrderPrioritySelect = ({ className, order, readonly }: OrderPrioritySelectProps) => {
  const initialPriority = order?.sales_order?.priority?.id?.toString() ?? ''
  const [priority, setPriority] = useState(initialPriority)

  const { handleUpsertSalesOrders } = useUpsertSalesOrder({
    onError: () => {
      setPriority(initialPriority)
    }
  })

  const handleOrderPriorityChange = (value: string) => {
    setPriority(value)
    handleUpsertSalesOrders([
      {
        id: order?.sales_order?.id,
        payload: {
          order: order.id,
          priority: parseInt(value)
        }
      }
    ])
  }

  return (
    <BasicPrioritySelect
      className={className}
      onChange={handleOrderPriorityChange}
      priority={priority}
      readonly={
        readonly ||
        order.sales_order?.status === 'wrapped' ||
        order.sales_order?.status === 'delivered'
      }
    />
  )
}
