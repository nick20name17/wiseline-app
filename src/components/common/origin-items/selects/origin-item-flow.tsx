import { useState } from 'react'

import { BasicFlowSelect } from '../../selects/basic-flow'

import { useUpsertItem } from '@/api/items/query'
import type { OriginItem } from '@/api/origin-items/schema'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface OrderFlowSelectProps {
  className?: string
  originItem: OriginItem
  readonly?: boolean
}

export const OriginItemFlowSelect = ({ className, originItem, readonly }: OrderFlowSelectProps) => {
  const { item } = originItem

  const initialFlow = item?.flow?.id.toString()
  const [flow, setFlow] = useState(initialFlow)

  const { handleUpsertItem } = useUpsertItem({
    onError: () => {
      setFlow(initialFlow)
    }
  })

  const handleOrderFlowChange = (value: string) => {
    setFlow(value)
    handleUpsertItem({
      id: item?.id,
      payload: {
        origin_item: originItem.id,
        flow: parseInt(value),
        order: originItem.origin_order
      }
    })
  }

  if (readonly || originItem.item?.status === 'wrapped' || originItem.item?.status === 'shipped') {
    return item?.flow?.name ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className='w-full truncate text-left'>{item?.flow?.name}</TooltipTrigger>
          <TooltipContent>
            <p>{item?.flow?.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      '—'
    )
  }

  return (
    <BasicFlowSelect
      category={originItem.category}
      className={className}
      onChange={handleOrderFlowChange}
      value={flow}
    />
  )
}
