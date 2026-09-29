import { cn } from 'cn'

type StatusPillProps = {
  /** No status is a dash, not an invented chip. */
  status: { label: string; tint: string } | null
}

export const StatusPill = ({ status }: StatusPillProps) =>
  status ? (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium tracking-wider uppercase',
        status.tint
      )}
    >
      <span aria-hidden className='size-1.5 rounded-full bg-current' />
      {status.label}
    </span>
  ) : (
    <span className='text-muted-foreground'>—</span>
  )
