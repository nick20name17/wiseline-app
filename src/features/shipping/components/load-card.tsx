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
  // A phone has no room for the columns: the order and its customer head the row, the figures and
  // the action go under them.
  <li className='flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-sm'>
    {lead}
    {/* A supplier pickup has no order number; the server puts the supplier in both fields. */}
    {/* Past its ship date and not delivered p3 (605,628). */}
    <span
      className={cn(
        'w-28 font-mono font-medium max-md:w-auto',
        order.is_overdue && 'text-destructive'
      )}
      title={order.is_overdue ? 'Overdue' : undefined}
    >
      {order.kind === 'pickup' ? (
        <Badge variant='muted'>Pickup</Badge>
      ) : (
        (order.order_number ?? '—')
      )}
    </span>
    <span className='min-w-0 flex-1 truncate'>{order.customer ?? '—'}</span>
    {order.is_overdue ? (
      <span className='text-xs text-destructive pointer-fine:hidden'>Overdue</span>
    ) : null}
    <span aria-hidden className='basis-full md:hidden' />
    <span className='w-28 text-right font-mono text-muted-foreground max-md:w-auto'>
      {formatWeight(order.weight)}
    </span>
    <span className='w-24 text-right text-xs text-muted-foreground max-md:w-auto'>
      {statusLabel(order.status) ?? ''}
    </span>
    {/* The shipper sends what is done when the customer needs it (round 10, C1). */}
    <span className='flex w-32 justify-end max-md:w-auto'>
      <ReadyCount order={order.order} readiness={order} />
    </span>
    {trail ? <span className='max-md:ml-auto'>{trail}</span> : null}
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
      {/* On a phone the action takes the card's width: it is what the Driver came to press. */}
      {action ? <span className='ml-auto max-md:w-full max-md:*:w-full'>{action}</span> : null}
    </header>
    <ul>{children}</ul>
  </section>
)
