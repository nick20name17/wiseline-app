import { useState } from 'react'

import { BasicInputWithSubmit } from '../../inputs/basic-input-with-submit'

import { useUpsertItem } from '@/api/items/query'
import type { OriginItem } from '@/api/origin-items/schema'

interface PullFromStockInputProps {
  className?: string
  originItem: OriginItem
  readonly?: boolean
}

export const PullFromStockInput = ({
  className,
  originItem,
  readonly
}: PullFromStockInputProps) => {
  const [pullFromStock, setPullFromStock] = useState<number | undefined>(
    originItem.item?.pull_from_stock ?? 0
  )

  const { handleUpsertItem, isPending } = useUpsertItem({
    onError: () => {
      setPullFromStock(originItem.item?.pull_from_stock ?? 0)
    }
  })

  const { item } = originItem

  const onPullFromStockChange = ({ value }: { value: number }) => {
    setPullFromStock(value)
    handleUpsertItem({
      id: item?.id,
      payload: {
        origin_item: originItem.id,
        pull_from_stock: value,
        order: originItem.origin_order
      }
    })
  }

  if (
    readonly ||
    originItem.item?.status === 'wrapped' ||
    originItem.item?.status === 'shipped' ||
    originItem?.item?.status === 'stock'
  ) {
    return <span>{item?.pull_from_stock ?? 0}</span>
  }

  return (
    <BasicInputWithSubmit
      type='number'
      setValue={setPullFromStock}
      value={pullFromStock}
      disabled={isPending || !originItem?.on_hand || originItem?.on_hand <= 0}
      className={className}
      onSubmit={onPullFromStockChange}
      max={Math.min(originItem?.quantity ?? 0, originItem?.on_hand ?? 0)}
    />
  )
}
