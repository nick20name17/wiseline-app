import { RiArrowLeftSLine, RiDirectionLine } from '@remixicon/react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export const DeliverySkeleton = () => {
  return (
    <div className='-mx-4'>
      <div className='flex h-13 items-center gap-2 border-b bg-[#FAFAFA] px-3.5'>
        <Button
          variant='outline'
          size='icon'
        >
          <RiArrowLeftSLine />
        </Button>
        <span className='flex items-center gap-1.5 font-medium'>
          <span>Load ID:</span> <Skeleton className='size-6 rounded-lg' />
        </span>

        <div className='ml-auto flex items-center gap-2'>
          <Skeleton className='h-6.5 w-20 rounded-full' />
          {/* <Skeleton className='h-6.5 w-16 rounded-lg' /> */}
        </div>
      </div>
      <div className='flex h-13 items-center justify-between gap-2 border-b bg-[#FAFAFA] px-3.5'>
        <div className='text-muted-foreground'>Address:</div>
        <Button className='w-32'>
          <RiDirectionLine />
          <span>Route</span>
        </Button>
      </div>

      <div className='container mt-3 grid gap-2'>
        {Array.from({ length: 5 }).map((_, i) => {
          return (
            <Skeleton
              className='h-13 w-full rounded-lg'
              key={i}
            />
          )
        })}
      </div>
    </div>
  )
}
