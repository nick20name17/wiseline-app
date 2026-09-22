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
import {
  departmentStateOf,
  prioritiesQuery,
  useSetPriority,
  type Priority,
  type TrimOrder
} from '../api'

const NO_PRIORITY = 'none'

type PriorityCellProps = {
  order: TrimOrder
  departmentId: number | undefined
  /** A Worker sees the priority and works to it, but cannot set it. */
  readOnly: boolean
}

/**
 * The priority's own colour tints the pill, so a row is read by colour before it is read by word. The
 * colour arrives per row, so it is handed to the classes as custom properties.
 */
const wash = (color: string) => `color-mix(in oklch, ${color} 16%, transparent)`

const Pill = ({ priority, className }: { priority: Priority | null; className?: string }) => (
  <span
    style={
      priority?.color
        ? ({ '--ink': priority.color, '--wash': wash(priority.color) } as CSSProperties)
        : undefined
    }
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium tracking-wider uppercase',
      priority ? 'bg-(--wash) text-(--ink)' : 'bg-muted text-muted-foreground',
      className
    )}
  >
    <span
      aria-hidden
      className={cn('size-1.5 rounded-full', priority ? 'bg-(--ink)' : 'bg-muted-foreground')}
    />
    {priority ? priority.name : 'Set priority'}
  </span>
)

export const PriorityCell = ({ order, departmentId, readOnly }: PriorityCellProps) => {
  const { data: priorities } = useQuery(prioritiesQuery(departmentId))
  const mutation = useSetPriority()
  const current = departmentStateOf(order, departmentId)?.priority ?? null

  if (readOnly || !departmentId) return <Pill priority={current} />

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
        <Pill priority={current} className='cursor-pointer hover:brightness-95' />
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
