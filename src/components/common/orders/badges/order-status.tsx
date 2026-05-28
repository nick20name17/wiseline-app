import type { OrderStatus } from '@/api/orders/schema'
import type { BadgeOption } from '@/components/common/badges/types'
import { cn } from '@/lib/utils'

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

type OrderStatusOption = BadgeOption<OrderStatus>

const ORDER_STATUS_OPTIONS: OrderStatusOption[] = [
  {
    value: null,
    text: 'Not Started',
    className: '[&_div]:bg-input'
  },
  {
    value: 'in_production',
    text: 'In Production',
    className: '[&_div]:bg-[#F78C49]'
  },
  {
    value: 'wrapped',
    text: 'Wrapped',
    className: '[&_div]:bg-primary'
  },
  {
    value: 'delivered',
    text: 'Delivered',
    className: '[&_div]:bg-[#9B51E0]'
  }
] as const

const getOrderStatusOption = (status: OrderStatus = null): OrderStatusOption =>
  ORDER_STATUS_OPTIONS.find((o) => o.value === status) ?? ORDER_STATUS_OPTIONS[0]

export const OrderStatusBadge = ({ status, className }: OrderStatusBadgeProps) => {
  const option = getOrderStatusOption(status)

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm [&_div]:size-3.5',
        option.className,
        className
      )}
    >
      <div className='size-4 rounded-sm'></div>
      <span>{option.text}</span>
    </div>
  )
}
