import { RiCarFill, RiCaravanFill } from '@remixicon/react'

import type { BadgeOption } from '../../badges/types'
import { UNKNOWN_OPTION } from '../../badges/unknow'

import type { ShipVia } from '@/api/orders/schema'
import { cn } from '@/lib/utils'

type ShipViaOption = BadgeOption<ShipVia | (string & {})>

const SHIP_VIA_OPTIONS: ShipViaOption[] = [
  {
    value: 'Delivery',
    text: 'Delivery',
    icon: RiCarFill,
    className: '[&_svg]:text-[#BB6BD9]'
  },
  {
    value: 'Pickup',
    text: 'Pickup',
    icon: RiCaravanFill,
    className: '[&_svg]:text-primary'
  }
]

const getShipViaOption = (shipVia: ShipVia): ShipViaOption =>
  SHIP_VIA_OPTIONS.find((o) => o.value === shipVia) ?? UNKNOWN_OPTION

interface ShipViaBadgeProps {
  shipVia: ShipVia
}

export const ShipViaBadge = ({ shipVia }: ShipViaBadgeProps) => {
  const option = getShipViaOption(shipVia)
  const Icon = option.icon

  return (
    <div className={cn('flex items-center gap-1 text-sm [&_svg]:size-4', option.className)}>
      {Icon ? <Icon /> : null}
      <span>{option.text}</span>
    </div>
  )
}
