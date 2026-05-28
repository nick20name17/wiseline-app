import { RiArrowRightSLine, RiCaravanLine } from '@remixicon/react'
import { Link } from '@tanstack/react-router'

import { DeliveryStatusBadge } from './status-badge'
import type { Load } from '@/api/loads/schema'
import { Button } from '@/components/ui/button'

interface DeliveryCardProps {
  load: Load
}

export const DeliveryCard = ({ load }: DeliveryCardProps) => {
  return (
    <div className='flex h-13 items-center gap-2 rounded-lg border bg-[#FAFAFA] px-3.5'>
      <RiCaravanLine className='text-muted-foreground size-4' />
      <span className='font-medium'>Load ID: {load.id}</span>

      <div className='ml-auto flex items-center gap-2'>
        <DeliveryStatusBadge load={load} />
        <Link
          to='/driver/$load'
          params={{ load: load.id?.toString() }}
        >
          <Button
            className='hover:bg-muted-foreground/10'
            variant='ghost'
            size='icon'
          >
            <RiArrowRightSLine />
          </Button>
        </Link>
      </div>
    </div>
  )
}
