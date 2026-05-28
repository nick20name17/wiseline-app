import { FlowsActionsMenu } from '../actions'

import type { Flow } from '@/api/flows/schema'
import { cn } from '@/lib/utils'

interface FlowCardProps {
  className?: string
  flow: Flow
}

export const FlowCard = ({ className, flow }: FlowCardProps) => {
  const isFlatStock = flow.name === 'Flat Stock'
  return (
    <div
      className={cn('flex items-center justify-between gap-5 rounded-2xl border p-5', className)}
    >
      <div className='font-medium'>{flow.name}</div>
      {isFlatStock ? null : (
        <FlowsActionsMenu
          flow={flow}
          categoryId={flow.category}
        />
      )}
    </div>
  )
}
