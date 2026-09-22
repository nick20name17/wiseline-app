import { cn } from 'cn'

type StatusPillProps = {
  status: { label: string; tint: string } | null
  /** Until an order is released it has no status, and a dash is that nothing — not an invented chip. */
  fallback?: string
}

export const StatusPill = ({ status, fallback = '—' }: StatusPillProps) =>
  status ? (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium tracking-wider uppercase',
        status.tint
      )}
    >
      <span aria-hidden className='size-1.5 rounded-full bg-current' />
      {status.label}
    </span>
  ) : (
    <span className='text-muted-foreground'>{fallback}</span>
  )
