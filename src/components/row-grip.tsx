import { cn } from 'cn'
import { GripVertical } from 'lucide-react'
import type { ComponentProps } from 'react'

type RowGripProps = ComponentProps<'button'> & {
  /** The row's place in the list, which is what moving it changes. */
  number: number
}

const NUMBER = 'font-mono text-xs text-muted-foreground tabular-nums'

/**
 * The handle of a row that can be moved, as tablecn's grid has it. In a table it is the whole cell
 * and shows the row's number, the grip taking its place while the row is hovered or the handle has
 * the keyboard. A finger cannot hover, so a card keeps the grip, sized for a thumb.
 */
export const RowGrip = ({ number, className, ...props }: RowGripProps) => (
  <button
    type='button'
    data-fills-cell
    data-grip
    className={cn(
      'group/grip flex cursor-grab items-center justify-center text-muted-foreground outline-none select-none aria-disabled:cursor-default',
      'max-lg:rounded-sm max-lg:focus-visible:ring-3 max-lg:focus-visible:ring-ring/50 max-lg:aria-disabled:opacity-50 pointer-coarse:-m-3 pointer-coarse:p-3',
      'lg:absolute lg:inset-0 lg:focus-visible:ring-2 lg:focus-visible:ring-ring/50 lg:focus-visible:ring-inset',
      className
    )}
    {...props}
  >
    <span
      className={cn(
        NUMBER,
        'max-lg:hidden lg:group-focus-visible/grip:hidden lg:group-not-aria-disabled/grip:in-[tr:hover]:hidden'
      )}
    >
      {number}
    </span>
    <GripVertical className='size-3.5 lg:hidden lg:group-focus-visible/grip:block lg:group-not-aria-disabled/grip:in-[tr:hover]:block pointer-coarse:size-4' />
  </button>
)

/** The number alone, for a row that cannot be moved: the list still reads in order. */
export const RowNumber = ({ number }: { number: number }) => (
  <span className={cn(NUMBER, 'max-lg:hidden')}>{number}</span>
)
