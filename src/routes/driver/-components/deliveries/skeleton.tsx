import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DeliveriesSkeletonProps {
  className?: string
}
export const DeliveriesSkeleton = ({ className }: DeliveriesSkeletonProps) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        return (
          <Skeleton
            className='h-13 w-full rounded-lg'
            key={i}
          />
        )
      })}
    </div>
  )
}
