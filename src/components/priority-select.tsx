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
    {/* In a table the cell is the control, as in tablecn: it shows the value bare and is outlined
        while its list is open; a pill in every row of a column repeats a box the cell already is. The select's own box and chevron would turn every row into a form
        field. In a card, where the cell is a labelled field, a finger hits around the value. */}
    <SelectPrimitive.Trigger
      data-fills-cell
      aria-label={current ? `Priority: ${current.name}` : 'Set priority'}
      className={cn(
        'cursor-pointer outline-none after:absolute',
        'max-lg:relative max-lg:rounded-md max-lg:focus-visible:ring-3 max-lg:focus-visible:ring-ring/50 max-md:after:-inset-x-1 max-md:after:-inset-y-2.5',
        'lg:after:inset-0 lg:after:ring-inset lg:focus-visible:after:ring-2 lg:focus-visible:after:ring-ring/50 lg:data-popup-open:after:ring-2 lg:data-popup-open:after:ring-primary'
      )}
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
