import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
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
  const mutation = useSetPriority()
  const current = departmentStateOf(order, departmentId)?.priority ?? null

  if (!departmentId) return <PriorityPill priority={current} />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type='button'
            disabled={mutation.isPending}
            aria-label={current ? `Priority: ${current.name}` : 'Set priority'}
          />
        }
      >
        <PriorityPill priority={current} className='cursor-pointer hover:brightness-95' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='min-w-48'>
        <DropdownMenuRadioGroup
          value={current ? String(current.id) : NO_PRIORITY}
          onValueChange={value =>
            mutation.mutate({
              order,
              departmentId,
              priorityId: value === NO_PRIORITY ? null : Number(value)
            })
          }
        >
          {priorities?.map(priority => (
            <DropdownMenuRadioItem key={priority.id} value={String(priority.id)}>
              <span
                aria-hidden
                style={priority.color ? ({ '--ink': priority.color } as CSSProperties) : undefined}
                className={cn(
                  'size-2 rounded-full',
                  priority.color ? 'bg-(--ink)' : 'bg-muted-foreground'
                )}
              />
              {priority.name}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuRadioItem value={NO_PRIORITY}>
            <span aria-hidden className='size-2 rounded-full bg-muted-foreground' />
            No priority
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
