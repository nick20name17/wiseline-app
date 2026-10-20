import { cn } from 'cn'

type TabCountProps = {
  count: number | undefined
  /** The count takes the tab's own colour, so the active one reads as one thing. */
  active: boolean
}

/**
 * The figure beside a tab's name. It holds its place while the list loads, rather than shunting the
 * tabs beside it.
 */
export const TabCount = ({ count, active }: TabCountProps) => (
  <span
    className={cn(
      'ml-0.5 inline-grid justify-items-center rounded-full px-1.5 font-mono text-xs',
      active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      count === undefined && 'opacity-0'
    )}
  >
    <span className='col-start-1 row-start-1'>{count}</span>
    {/* Three digits wide whatever the figure, the size the lists run to, so neither the placeholder
        nor a figure of one or two digits moves the tabs. */}
    <span aria-hidden className='invisible col-start-1 row-start-1'>
      000
    </span>
  </span>
)
