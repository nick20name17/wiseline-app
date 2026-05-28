import { RiLeafLine } from '@remixicon/react'

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

interface DeliveriesEmptyStateProps {
  className?: string
}

export const DeliveriesEmptyState = ({ className }: DeliveriesEmptyStateProps) => {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia
          className='bg-transparent'
          variant='icon'
        >
          <RiLeafLine className='size-12 text-[#F2F2F2]' />
        </EmptyMedia>
        <EmptyTitle>You have no deliveries for today</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
