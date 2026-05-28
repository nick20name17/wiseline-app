import { FlowCard } from './card'
import type { Flow } from '@/api/flows/schema'
import { Skeleton } from '@/components/ui/skeleton'

interface FlowsListProps {
  flows: Flow[]
  isLoading: boolean
}

export const FlowsList = ({ flows, isLoading }: FlowsListProps) => {
  if (isLoading) {
    return <FlowsListSkeleton />
  }

  return (
    <div className='space-y-5'>
      {flows.map((flow) => {
        return (
          <FlowCard
            key={flow.id}
            flow={flow}
          />
        )
      })}
    </div>
  )
}

const FlowsListSkeleton = () => {
  return Array.from({ length: 5 }).map((_, index) => (
    <Skeleton
      className='h-20 w-full rounded-lg'
      key={index}
    />
  ))
}
