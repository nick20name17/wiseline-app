import { useState } from 'react'

import { BasicStageSelect } from '../../selects/basic-stage'

import { useUpsertItem } from '@/api/items/query'
import type { OriginItem } from '@/api/origin-items/schema'

interface OrderStageSelectProps {
  className?: string
  originItem: OriginItem
}

export const OriginItemStageSelect = ({ className, originItem }: OrderStageSelectProps) => {
  const { item } = originItem

  const initialStage = item?.stage?.id.toString()
  const [stage, setStage] = useState(initialStage)

  const { handleUpsertItem } = useUpsertItem({
    onError: () => {
      setStage(initialStage)
    }
  })

  const handleOrderStageChange = (value: string) => {
    setStage(value)
    handleUpsertItem({
      id: item?.id,
      payload: {
        origin_item: originItem.id,
        stage: parseInt(value),
        order: originItem.origin_order
      }
    })
  }

  return (
    <BasicStageSelect
      className={className}
      onChange={handleOrderStageChange}
      value={stage}
    />
  )
}
