import { useState } from 'react'

import { BasicInputWithSubmit } from '../../inputs/basic-input-with-submit'

import type { OriginItem } from '@/api/origin-items/schema'
import { useUpsertRemanufacturing } from '@/api/remanufacturing/query'

interface RemanufactureProdInputProps {
  className?: string
  originItem: OriginItem
  readonly?: boolean
}

export const RemanufactureProdInput = ({
  className,
  originItem,
  readonly
}: RemanufactureProdInputProps) => {
  const [remanufactureFromProd, setRemanufactureFromProd] = useState<number | undefined>(
    originItem.remanufacturing_qty ?? 0
  )

  const { handleUpsertRemanufacturing, isPending } = useUpsertRemanufacturing({
    onError: () => {
      setRemanufactureFromProd(originItem.remanufacturing_qty ?? 0)
    },
    originItem
  })

  const onPullFromProdChange = ({ value }: { value: number }) => {
    setRemanufactureFromProd(value)
    handleUpsertRemanufacturing({
      autoid: originItem.id,
      status: originItem?.item?.status ?? null,
      payload: {
        origin_item: originItem.id,
        remanufacturing_qty: value,
        order: originItem.origin_order,
        status: originItem?.item?.status ?? null,
        pull_from_stock_qty: originItem.remanufacturing_from_stock_qty
      }
    })
  }

  if (readonly) {
    return <span>{originItem.remanufacturing_qty ?? 0}</span>
  }

  return (
    <BasicInputWithSubmit
      type='number'
      setValue={setRemanufactureFromProd}
      value={remanufactureFromProd}
      disabled={isPending || !originItem?.quantity}
      max={originItem.quantity}
      className={className}
      onSubmit={onPullFromProdChange}
    />
  )
}
