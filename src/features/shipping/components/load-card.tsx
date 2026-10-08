import { Badge } from '@/components/ui/badge'
import { cn } from 'cn'
import { formatWeight } from '../lib/format'
import { statusLabel } from '../lib/status'
import type { Assignment, DayLoad } from '../api'
import { ReadyCount } from './order-readiness'

type OrderLineProps = {
  order: Assignment
  /** Before the order number: a checkbox or the Load's marker. */
  lead?: React.ReactNode
  /** After the status: the row's action. */
  trail?: React.ReactNode
}

/** An order on a truck, the same row in Shipping, Loading and Driver. */
export const OrderLine = ({ order, lead, trail }: OrderLineProps) => (
  <li className='flex items-center gap-3 border-t border-border px-3 py-2 text-sm'>
    {lead}
    {/* A supplier pickup has no order number; the server puts the supplier in both fields. */}
    {/* Past its ship date and not delivered p3 (605,628). */}
    <span
      className={cn('w-28 font-mono font-medium', order.is_overdue && 'text-destructive')}
      title={order.is_overdue ? 'Overdue' : undefined}
    >
      {order.kind === 'pickup' ? (
        <Badge variant='muted'>Pickup</Badge>
      ) : (
        (order.order_number ?? '—')
      )}
    </span>
    <span className='min-w-0 flex-1 truncate'>{order.customer ?? '—'}</span>
    <span className='w-28 text-right font-mono text-muted-foreground'>
      {formatWeight(order.weight)}
    </span>
    <span className='w-24 text-right text-xs text-muted-foreground'>
      {statusLabel(order.status) ?? ''}
    </span>
    {/* The shipper sends what is done when the customer needs it (round 10, C1). */}
    <span className='flex w-32 justify-end'>
      <ReadyCount order={order.order} readiness={order} />
    </span>
    {trail}
  </li>
)

type LoadCardProps = {
  load: DayLoad
  /** The Load's action, at the end of its header. */
  action?: React.ReactNode
  children: React.ReactNode
}

/** A released Load in the Loading and Driver windows: its truck, weight and status over its orders. */
export const LoadCard = ({ load, action, children }: LoadCardProps) => (
  <section className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
    <header className='flex flex-wrap items-center gap-3 px-3 py-2.5'>
      <span className='font-medium'>
        {load.truck ? `Truck ${load.truck.name} · ` : ''}
        {load.name}
      </span>
      <span className='font-mono text-sm text-muted-foreground'>{formatWeight(load.weight)}</span>
      <Badge variant='muted'>{statusLabel(load.status)}</Badge>
      {action ? <span className='ml-auto'>{action}</span> : null}
    </header>
    <ul>{children}</ul>
  </section>
)
