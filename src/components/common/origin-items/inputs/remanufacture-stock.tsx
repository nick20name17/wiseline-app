import { useState } from 'react'

import { BasicInputWithSubmit } from '../../inputs/basic-input-with-submit'

import type { OriginItem } from '@/api/origin-items/schema'
import { useUpsertRemanufacturing } from '@/api/remanufacturing/query'

interface RemanufactureStockInputProps {
  className?: string
  originItem: OriginItem
  readonly?: boolean
}

export const RemanufactureStockInput = ({
  className,
  originItem,
  readonly
}: RemanufactureStockInputProps) => {
  const [remanufactureFromStock, setRemanufactureFromStock] = useState<number | undefined>(
    originItem.remanufacturing_from_stock_qty ?? 0
  )

  const { handleUpsertRemanufacturing, isPending } = useUpsertRemanufacturing({
    onError: () => {
      setRemanufactureFromStock(originItem.remanufacturing_from_stock_qty ?? 0)
    },
    originItem
  })

  const onPullFromStockChange = ({ value }: { value: number }) => {
    setRemanufactureFromStock(value)
    handleUpsertRemanufacturing({
      autoid: originItem.id,
      status: originItem?.item?.status ?? null,
      payload: {
        origin_item: originItem.id,
        pull_from_stock_qty: value,
        order: originItem.origin_order,
        status: originItem?.item?.status ?? null,
        remanufacturing_qty: originItem.remanufacturing_qty
      }
    })
  }

  if (readonly) {
    return <span>{originItem.remanufacturing_from_stock_qty ?? 0}</span>
  }

  return (
    <BasicInputWithSubmit
      type='number'
      setValue={(value) => setRemanufactureFromStock(value)}
      value={remanufactureFromStock}
      disabled={isPending || !originItem?.on_hand}
      max={originItem?.item?.pull_from_stock ?? 0}
      className={className}
      onSubmit={onPullFromStockChange}
    />
  )
}
