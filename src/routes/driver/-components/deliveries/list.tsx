import { DeliveryCard } from './card'
import { DeliveriesEmptyState } from './empty-state'
import { DeliveriesSkeleton } from './skeleton'
import type { Load } from '@/api/loads/schema'
import { cn } from '@/lib/utils'

interface DeliveriesListProps {
  loads: Load[]
  isLoading: boolean
  className?: string
}

export const DeliveriesList = ({ loads, isLoading, className }: DeliveriesListProps) => {
  if (isLoading) {
    return <DeliveriesSkeleton className={className} />
  }

  if (loads.length === 0 && !isLoading) {
    return <DeliveriesEmptyState className={className} />
  }

  return (
    <div className={cn('space-y-2', className)}>
      {loads.map((load) => (
        <DeliveryCard
          load={load}
          key={load.id}
        />
      ))}
    </div>
  )
}
