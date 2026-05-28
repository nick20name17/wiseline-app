import { RiEyeFill } from '@remixicon/react'
import { useIsMutating } from '@tanstack/react-query'
import { useState } from 'react'

import type { Order } from '@/api/orders/schema'
import { useUpsertSalesOrder } from '@/api/sales-orders/query'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

interface ReviewToggleProps {
  className?: string
  order: Order
  readonly?: boolean
}

export const ReviewToggle = ({ className, order, readonly }: ReviewToggleProps) => {
  const salesOrder = order?.sales_order

  const isUpdatingSalesOrder = useIsMutating({ mutationKey: ['update-sales-order'] }) > 0
  const isCreatingSalesOrder = useIsMutating({ mutationKey: ['create-sales-order'] }) > 0

  const initialReleased = !!salesOrder?.assigned

  const [released, setReleased] = useState(initialReleased)

  const { handleUpsertSalesOrders, isPending } = useUpsertSalesOrder({
    onError: () => {
      setReleased(initialReleased)
    }
  })

  const someOriginItemWrappedOrShipped = order.origin_items.some(
    (originItem) => originItem.item?.status === 'wrapped' || originItem.item?.status === 'shipped'
  )

  const handleToggleReleased = (value: boolean) => {
    setReleased(value)

    handleUpsertSalesOrders([
      {
        id: salesOrder?.id,
        payload: {
          order: order.id,
          assigned: value
        }
      }
    ])
  }

  return (
    <Toggle
      disabled={isPending || isUpdatingSalesOrder || isCreatingSalesOrder}
      pressed={released}
      onPressedChange={handleToggleReleased}
      className={cn(
        'h-full justify-start border-none px-0 hover:bg-transparent data-[state=on]:bg-transparent',
        readonly || someOriginItemWrappedOrShipped ? 'pointer-events-none' : '',
        className
      )}
    >
      {released ? (
        <>
          <RiEyeFill className='text-primary' />
          <span>Reviewed</span>
        </>
      ) : (
        <>
          <RiEyeFill />
          <span>—</span>
        </>
      )}
    </Toggle>
  )
}
