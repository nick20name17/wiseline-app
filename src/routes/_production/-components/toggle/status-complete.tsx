import { RiCheckboxCircleFill } from '@remixicon/react'
import { useState } from 'react'

import { useUpsertItem } from '@/api/items/query'
import type { OriginItemStatus } from '@/api/items/schema'
import type { OriginItem } from '@/api/origin-items/schema'
import { Toggle } from '@/components/ui/toggle'
import { useSearchParams } from '@/hooks/use-search-params'
import { cn } from '@/lib/utils'

interface StatusCompleteToggleProps {
  className?: string
  originItems: OriginItem[]
  completeStatus?: OriginItemStatus
}

export const StatusCompleteToggle = ({
  className,
  originItems,
  completeStatus
}: StatusCompleteToggleProps) => {
  const [{ category }] = useSearchParams()
  const item = originItems?.[0]?.item

  const nextStatus = completeStatus ? completeStatus : item?.flow?.next_status

  const defaultStatus = originItems.every(
    ({ item }) => item?.status && item?.statuses.includes(nextStatus ?? null)
  )

  const [statusCompleted, setStatusCompleted] = useState(defaultStatus)

  const { handleUpsertItem } = useUpsertItem({
    onError: () => {
      setStatusCompleted(defaultStatus)
    }
  })

  const prevStatuses: Partial<Record<Exclude<OriginItemStatus, null>, OriginItemStatus>> = {
    cut: null,
    bent: 'cut'
  }

  const handleStatusCompleteToggle = (value: boolean) => {
    setStatusCompleted(value)

    originItems.forEach((originItem) => {
      const nextStatus = completeStatus ? completeStatus : originItem?.item?.flow?.next_status
      const currentStatuses = (originItem?.item?.statuses ?? []).filter(
        (status): status is Exclude<OriginItemStatus, null> => status != null
      )
      const lastStatus = currentStatuses[currentStatuses.length - 1]
      const updatedStatuses = value
        ? nextStatus && lastStatus !== nextStatus
          ? [...currentStatuses, nextStatus]
          : currentStatuses
        : nextStatus && lastStatus === nextStatus
          ? currentStatuses.slice(0, -1)
          : currentStatuses
      const prevStatus = nextStatus ? (prevStatuses[nextStatus] ?? null) : null
      const nextStatusValue = value ? (nextStatus ?? null) : prevStatus

      handleUpsertItem({
        id: originItem.item?.id,
        payload: {
          origin_item: originItem.id,
          status: nextStatusValue,
          statuses: nextStatusValue === null ? [] : updatedStatuses,

          order: originItem.origin_order
        }
      })
    })
  }

  const disabled = originItems.some(({ item }) => {
    return (
      item?.status === 'wrapped' ||
      item?.status === 'shipped' ||
      (item?.flow?.next_status === 'bent' &&
        category === 'Trim' &&
        !completeStatus &&
        !item.statuses.includes('cut'))
    )
  })

  return (
    <Toggle
      pressed={statusCompleted}
      onPressedChange={handleStatusCompleteToggle}
      disabled={disabled}
      className={cn(
        'hover:[&_svg]:text-primary h-7 w-full data-[state=on]:bg-transparent',
        className,
        statusCompleted ? '[&_svg]:text-primary' : '[&_svg]:text-muted-foreground'
      )}
    >
      <RiCheckboxCircleFill />
      {<span>{statusCompleted ? 'Yes' : 'No'}</span>}
    </Toggle>
  )
}
