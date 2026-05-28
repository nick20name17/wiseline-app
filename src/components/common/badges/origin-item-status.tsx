import type { BadgeOption } from './types'
import type { OriginItemStatus } from '@/api/items/schema'
import { cn } from '@/lib/utils'

interface OriginItemStatusBadgeProps {
  status: OriginItemStatus
}

type OriginItemStatusOption = BadgeOption<OriginItemStatus>

const ORIGINITEM_STATUS_OPTIONS: ReadonlyArray<OriginItemStatusOption> = [
  {
    value: null,
    text: 'Not Started',
    className: '[&_div]:bg-input'
  },
  {
    value: 'cut',
    text: 'Cut',
    className: '[&_div]:bg-info'
  },
  {
    value: 'bent',
    text: 'Bent',
    className: '[&_div]:bg-destructive'
  },
  {
    value: 'stock',
    text: 'Pull from Stock',
    className: '[&_div]:bg-yellow'
  },

  {
    value: 'wrapped',
    text: 'Wrapped',
    className: '[&_div]:bg-primary'
  },
  {
    value: 'shipped',
    text: 'Delivered',
    className: '[&_div]:bg-[#9B51E0]'
  }
]

const UNKNOWN_OPTION: OriginItemStatusOption = {
  value: '-' as OriginItemStatus,
  text: '-',
  className: ''
}

const getOriginItemStatusOption = (status: OriginItemStatus): OriginItemStatusOption =>
  ORIGINITEM_STATUS_OPTIONS.find((o) => o.value === status) ?? UNKNOWN_OPTION

export const OriginItemStatusBadge = ({ status }: OriginItemStatusBadgeProps) => {
  const option = getOriginItemStatusOption(status)

  return (
    <div className={cn('flex items-center gap-1.5 text-sm [&_div]:size-3.5', option.className)}>
      <div className='size-4 rounded-sm'></div>
      <span>{option.text}</span>
    </div>
  )
}
