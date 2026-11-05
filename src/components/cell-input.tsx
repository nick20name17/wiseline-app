import { cn } from 'cn'
import type { ComponentProps } from 'react'

/**
 * A text field that is its table cell: the text reads as the cell's own, cut short with the whole of
 * it on hover, and a ring shows only while typing. A bordered box inside a narrow column clipped its
 * own placeholder. In a card, below `lg`, it is a plain field. Not the shadcn input, which owns its
 * box and ring.
 */
export const CellInput = ({ className, ...props }: ComponentProps<'input'>) => (
  <input
    data-fills-cell
    title={typeof props.value === 'string' && props.value ? props.value : undefined}
    className={cn(
      'w-full min-w-0 truncate bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm',
      'max-lg:h-8 max-lg:rounded-lg max-lg:border max-lg:border-input max-lg:px-2.5 max-lg:transition-colors max-lg:focus-visible:border-ring max-lg:focus-visible:ring-3 max-lg:focus-visible:ring-ring/50 max-lg:dark:bg-input/30',
      'lg:absolute lg:inset-0 lg:px-2.5 lg:not-read-only:cursor-text lg:not-read-only:hover:bg-muted/50 lg:focus:ring-2 lg:focus:ring-primary lg:focus:ring-inset',
      className
    )}
    {...props}
  />
)

/**
 * `CellInput` for text that keeps its line breaks. It stays in the row's flow, since it is what makes
 * the row tall: in a table it reaches out over the cell's padding instead, so it is the cell all the
 * same.
 */
export const CellTextarea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea
    data-fills-cell
    className={cn(
      'block field-sizing-content w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm',
      'max-lg:min-h-8 max-lg:rounded-lg max-lg:border max-lg:border-input max-lg:px-2.5 max-lg:py-1.25 max-lg:transition-colors max-lg:focus-visible:border-ring max-lg:focus-visible:ring-3 max-lg:focus-visible:ring-ring/50 max-lg:dark:bg-input/30',
      'lg:-mx-2.5 lg:-my-0.75 lg:px-2.5 lg:py-2 lg:not-read-only:cursor-text lg:not-read-only:hover:bg-muted/50 lg:focus:ring-2 lg:focus:ring-primary lg:focus:ring-inset',
      className
    )}
    {...props}
  />
)
