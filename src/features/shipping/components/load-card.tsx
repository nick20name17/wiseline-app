import { Badge } from '@/components/ui/badge'
import { formatWeight } from '../lib/format'
import { statusLabel } from '../lib/status'
import type { Assignment, LoadTab, TruckCard } from '../api'

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
    <span className='w-28 font-mono font-medium'>{order.order_number ?? '—'}</span>
    <span className='min-w-0 flex-1 truncate'>{order.customer ?? '—'}</span>
    {order.kind === 'pickup' ? <Badge variant='muted'>Pickup</Badge> : null}
    <span className='w-28 text-right font-mono text-muted-foreground'>
      {formatWeight(order.weight)}
    </span>
    <span className='w-24 text-right text-xs text-muted-foreground'>
      {statusLabel(order.status) ?? ''}
    </span>
    {trail}
  </li>
)

type LoadCardProps = {
  card: TruckCard
  load: LoadTab
  /** The Load's action, at the end of its header. */
  action?: React.ReactNode
  children: React.ReactNode
}

/** A released Load in the Loading and Driver windows: its truck, weight and status over its orders. */
export const LoadCard = ({ card, load, action, children }: LoadCardProps) => (
  <section className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
    <header className='flex flex-wrap items-center gap-3 px-3 py-2.5'>
      <span className='font-medium'>
        Truck {card.name} · {load.name}
      </span>
      <span className='font-mono text-sm text-muted-foreground'>{formatWeight(load.weight)}</span>
      <Badge variant='muted'>{statusLabel(load.status)}</Badge>
      {action ? <span className='ml-auto'>{action}</span> : null}
    </header>
    <ul>{children}</ul>
  </section>
)
