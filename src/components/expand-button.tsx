import { cn } from 'cn'
import { ChevronRight } from 'lucide-react'

type ExpandButtonProps = {
  expanded: boolean
  label: string
  onToggle: () => void
}

/**
 * Opens a row into its details. In a table the button is the cell, as a note's is: it covers the
 * cell's padding too, which in a column as narrow as the checkbox's would leave the chevron no room.
 * In a card it stays a ghost button in the card's corner. Not the shadcn button, which owns its box
 * and ring.
 */
export const ExpandButton = ({ expanded, label, onToggle }: ExpandButtonProps) => (
  <button
    type='button'
    data-fills-cell
    aria-label={label}
    aria-expanded={expanded}
    className={cn(
      'inline-flex cursor-pointer items-center justify-center outline-none',
      'max-lg:relative max-lg:size-7 max-lg:rounded-md max-lg:hover:bg-muted max-lg:focus-visible:ring-3 max-lg:focus-visible:ring-ring/50',
      'lg:absolute lg:inset-0 lg:focus-visible:ring-2 lg:focus-visible:ring-ring/50 lg:focus-visible:ring-inset'
    )}
    onClick={event => {
      event.stopPropagation()
      onToggle()
    }}
  >
    <ChevronRight
      className={cn('size-4 text-muted-foreground transition-transform', expanded && 'rotate-90')}
    />
  </button>
)
