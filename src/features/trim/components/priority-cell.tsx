import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import type { CSSProperties } from 'react'
import { departmentStateOf, prioritiesQuery, useSetPriority, type TrimOrder } from '../api'
import { PriorityPill } from './priority-pill'

const NO_PRIORITY = 'none'

type PriorityCellProps = {
  order: TrimOrder
  departmentId: number | undefined
}

export const PriorityCell = ({ order, departmentId }: PriorityCellProps) => {
  const { data: priorities } = useQuery(prioritiesQuery(departmentId))
  const mutation = useSetPriority(order.id)
  const current = departmentStateOf(order, departmentId)?.priority ?? null

  if (!departmentId) return <PriorityPill priority={current} />

  return (
    // A select, not a menu: the cell holds one value and the list picks it.
    <Select
      value={current ? String(current.id) : NO_PRIORITY}
      onValueChange={value =>
        mutation.mutate({
          order,
          departmentId,
          priority: priorities?.find(priority => String(priority.id) === value) ?? null
        })
      }
    >
      {/* The pill is the trigger, so the column reads as it always has; the select's own box and
          chevron would turn every row into a form field. */}
      <SelectPrimitive.Trigger
        aria-label={current ? `Priority: ${current.name}` : 'Set priority'}
        className='cursor-pointer rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
      >
        <PriorityPill priority={current} className='hover:brightness-95' />
      </SelectPrimitive.Trigger>
      <SelectContent align='start' className='min-w-48'>
        {priorities?.map(priority => (
          <SelectItem key={priority.id} value={String(priority.id)}>
            <span
              aria-hidden
              style={priority.color ? ({ '--ink': priority.color } as CSSProperties) : undefined}
              className={cn(
                'size-2 self-center rounded-full',
                priority.color ? 'bg-(--ink)' : 'bg-muted-foreground'
              )}
            />
            {priority.name}
          </SelectItem>
        ))}
        <SelectItem value={NO_PRIORITY}>
          <span aria-hidden className='size-2 self-center rounded-full bg-muted-foreground' />
          No priority
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
