import { PriorityPill, type PillPriority } from '@/components/priority-pill'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { CELL_TRIGGER } from '@/components/cell-trigger-class'
import { cn } from 'cn'
import type { CSSProperties } from 'react'

const NO_PRIORITY = 'none'

type Choice = PillPriority & { id: number }

type PrioritySelectProps<T extends Choice> = {
  priorities: T[] | undefined
  current: Choice | null
  onChange: (priority: T | null) => void
}

/** A priority cell that sets it: the pill is the trigger, the department's priorities the list. */
export const PrioritySelect = <T extends Choice>({
  priorities,
  current,
  onChange
}: PrioritySelectProps<T>) => (
  // A select, not a menu: the cell holds one value and the list picks it.
  <Select
    value={current ? String(current.id) : NO_PRIORITY}
    onValueChange={value =>
      onChange(priorities?.find(priority => String(priority.id) === value) ?? null)
    }
  >
    <SelectPrimitive.Trigger
      data-fills-cell
      aria-label={current ? `Priority: ${current.name}` : 'Set priority'}
      className={CELL_TRIGGER}
    >
      <PriorityPill priority={current} className='bg-transparent px-0' />
    </SelectPrimitive.Trigger>
    <SelectContent className='min-w-48'>
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
