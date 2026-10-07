import { PriorityPill, type PillPriority } from '@/components/priority-pill'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { Select as SelectPrimitive } from '@base-ui/react/select'
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
