import { cn } from 'cn'
import type { CSSProperties } from 'react'
import type { Priority } from '../api'

/**
 * The priority's own colour tints the pill, so a row is read by colour before it is read by word. The
 * colour arrives per row, so it is handed to the classes as custom properties.
 */
const wash = (color: string) => `color-mix(in oklch, ${color} 16%, transparent)`

type PriorityPillProps = {
  priority: Priority | null
  className?: string
}

export const PriorityPill = ({ priority, className }: PriorityPillProps) => (
  <span
    style={
      priority?.color
        ? ({ '--ink': priority.color, '--wash': wash(priority.color) } as CSSProperties)
        : undefined
    }
    className={cn(
      'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
      // A priority's name is a status and reads like one; the invitation to set one is plain words.
      priority
        ? 'bg-(--wash) tracking-wider text-(--ink) uppercase'
        : 'bg-muted text-muted-foreground',
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
