import { RiArrowRightSFill, RiInboxArchiveLine, RiTimeLine } from '@remixicon/react'
import { useParams } from '@tanstack/react-router'
import { useState } from 'react'

import { useUpdateShippedLoad } from '@/api/loads/query'
import type { Load, ShipmentStatus, SingleLoad } from '@/api/loads/schema'
import type { Package } from '@/api/packages/schema'
import type { Skids } from '@/api/skids/schema'
import type { BadgeOption } from '@/components/common/badges/types'
import { UNKNOWN_OPTION } from '@/components/common/badges/unknow'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ShipmentStatusOption = BadgeOption<ShipmentStatus>

const DELIVERY_BADGE_CONFIG: ShipmentStatusOption[] = [
  {
    value: null,
    text: 'Not Delivered',
    className: 'bg-muted text-muted-foreground border-muted-foreground',
    icon: RiTimeLine
  },
  {
    value: 'loaded',
    text: 'Not Delivered',
    className: 'bg-muted text-muted-foreground border-muted-foreground',
    icon: RiTimeLine
  },
  {
    value: 'shipping',
    text: 'Delivering',
    className: 'bg-blue-50 text-blue-400 border-blue-200 [&_svg]:text-blue-400',
    icon: RiTimeLine
  },
  {
    value: 'shipped',
    text: 'Delivered',
    className: 'bg-[#FFF7E0] text-[#957309] border-[#FFEBAD] [&_svg]:text-[#957309]',
    icon: RiInboxArchiveLine
  }
]

type PackageStatusOption = {
  value: ShipmentStatus
  text: string
  className: string
}

const PACKAGE_STATUS_CONFIG: PackageStatusOption[] = [
  {
    value: null,
    text: 'Not Delivered',
    className: 'bg-muted text-muted-foreground border-muted-foreground hover:bg-muted/50'
  },
  {
    value: 'loaded',
    text: 'Not Delivered',
    className: 'bg-muted text-muted-foreground border-muted-foreground hover:bg-muted/50'
  },
  {
    value: 'shipped',
    text: 'Delivered',
    className: 'bg-[#FFF7E0] text-[#957309] border-[#FFEBAD] hover:bg-[#FFF7E0]/80'
  }
]

const getNextPackageStatus = (status: ShipmentStatus): ShipmentStatus => {
  if (status === null || status === 'loaded' || status === 'loading') return 'shipped'

  return null
}

interface DeliveryStatusBadgeProps {
  load: SingleLoad | Load
}

export const DeliveryStatusBadge = ({ load }: DeliveryStatusBadgeProps) => {
  const config = DELIVERY_BADGE_CONFIG.find((o) => o.value === load.status) ?? UNKNOWN_OPTION
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex h-6.5 items-center justify-center gap-1 rounded-full border px-2 text-sm leading-none',
        config.className
      )}
    >
      {Icon && <Icon className='size-4' />}
      {config.text}
    </div>
  )
}

interface PackageCardStatusProps {
  pack: Package | Skids
  className?: string
}

export default ({ className, pack }: PackageCardStatusProps) => {
  const { load } = useParams({ from: '/driver/$load/' })

  const [status, setStatus] = useState<ShipmentStatus>(pack?.status ?? null)

  const updateLoadMutation = useUpdateShippedLoad()

  const handleNextStatus = () => {
    const isPackage = 'package_items' in pack

    const nextStatus = getNextPackageStatus(status)
    const isShipped = nextStatus === 'shipped'

    updateLoadMutation.mutate({
      id: Number(load),
      payload: {
        is_shipped: isShipped,
        ...(isPackage ? { packages: [pack.id] } : { skids: [pack.id] })
      }
    })

    setStatus(nextStatus)
  }

  const config = PACKAGE_STATUS_CONFIG.find((o) => o.value === status) ?? UNKNOWN_OPTION

  return (
    <div className={cn('inline-flex -space-x-px rounded-md rtl:space-x-reverse', className)}>
      <Button
        size='sm'
        variant='outline'
        className={cn(
          'pointer-events-none h-7.5 rounded-none shadow-none first:rounded-s-md last:rounded-e-md focus-visible:z-10',
          config.className
        )}
      >
        {config.text}
      </Button>

      <Button
        size='icon-sm'
        variant='outline'
        aria-label='Change delivery status'
        onClick={handleNextStatus}
        className={cn(
          'size-7.5 rounded-none shadow-none first:rounded-s-md last:rounded-e-md focus-visible:z-10',
          config.className
        )}
      >
        <RiArrowRightSFill
          className='text-muted-foreground size-4'
          aria-hidden='true'
        />
      </Button>
    </div>
  )
}
