import { cn } from 'cn'

type StatusPillProps = {
  /** No status renders nothing, not an invented chip. */
  status: { label: string; tint: string } | null
}

// In a table cell the pill drops its box, as a priority's does: the cell is already one, and its
// colour and dot say the status. A card or a panel keeps the box.
export const StatusPill = ({ status }: StatusPillProps) =>
  status ? (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium tracking-wider whitespace-nowrap uppercase',
        status.tint,
        'in-data-[slot=table-cell]:bg-transparent in-data-[slot=table-cell]:px-0'
      )}
    >
      <span aria-hidden className='size-1.5 rounded-full bg-current' />
      {status.label}
    </span>
  ) : null
