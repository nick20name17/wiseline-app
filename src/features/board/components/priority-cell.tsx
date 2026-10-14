import { PriorityPill } from '@/components/priority-pill'
import { PrioritySelect } from '@/components/priority-select'
import { useQuery } from '@tanstack/react-query'
import { departmentStateOf, prioritiesQuery, useSetPriority, type BoardOrder } from '../api'
import { useViewOnly } from '../lib/board-context'

type PriorityCellProps = {
  order: BoardOrder
  departmentId: number | undefined
}

export const PriorityCell = ({ order, departmentId }: PriorityCellProps) => {
  const { data: priorities } = useQuery(prioritiesQuery(departmentId))
  const mutation = useSetPriority(order.id)
  const current = departmentStateOf(order, departmentId)?.priority ?? null
  const viewOnly = useViewOnly()

  if (!departmentId || viewOnly) return <PriorityPill priority={current} />

  return (
    <PrioritySelect
      priorities={priorities}
      current={current}
      onChange={priority => mutation.mutate({ order, departmentId, priority })}
    />
  )
}
