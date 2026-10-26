import { Description } from '@/components/description'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { orderLinesQuery, type Readiness } from '../api'
import { StatusPill } from '@/components/status-pill'
import { itemStatus, lineReadiness } from '@/lib/status'

const count = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/**
 * Every line of the order in every department, the ones not ready first: what can go on the truck
 * now and what is still being made.
 */
export const OrderLines = ({ order }: { order: string }) => {
  const { data: lines, isPending, isError } = useQuery(orderLinesQuery(order))

  if (isPending) return <Skeleton className='m-3 h-12' />
  if (isError) return <p className='px-3 py-2 text-sm text-destructive'>The lines did not load.</p>
  if (!lines.length)
    return <p className='px-3 py-2 text-sm text-muted-foreground'>No lines on this order.</p>

  return (
    <ul className='divide-y divide-border'>
      {lines.map(line => (
        // Two lines rather than six columns: a dialog's row is too narrow for the description.
        <li key={line.origin_item} className='flex items-start gap-3 px-3 py-2 text-sm'>
          <span className='w-24 shrink-0'>
            <StatusPill status={lineReadiness(line.ready)} />
          </span>
          <div className='min-w-0 flex-1'>
            <div className='flex gap-3'>
              <span className='truncate font-mono'>{line.product_id ?? '—'}</span>
              <span className='ml-auto shrink-0 font-mono' title='Packaged of the quantity ordered'>
                {count.format(line.packaged)} / {count.format(line.quantity)}
              </span>
            </div>
            <Description text={line.description} className='text-muted-foreground' />
            <p className='mt-1 flex items-center gap-2 text-xs text-muted-foreground'>
              {line.department ?? 'Bought in'}
              {line.status ? <StatusPill status={itemStatus(line.status)} /> : null}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

type ReadyCountProps = { order: string | null; readiness: Readiness; className?: string }

/**
 * «2 of 3 ready» on an order row, opening into its lines. A tap rather than a hover: the floor's
 * screens are touch. A dialog rather than a popover: an order of thirty lines ran a popover off the
 * screen, with nothing to scroll it by. Nothing for a pickup, which has no order lines.
 */
export const ReadyCount = ({ order, readiness, className }: ReadyCountProps) => {
  if (!order || !readiness.lines_total) return null
  const all = readiness.lines_ready === readiness.lines_total

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant={all ? 'ghost' : 'destructive'} size='sm' className={className} />}
      >
        {all ? 'All ready' : `${readiness.lines_ready} of ${readiness.lines_total} ready`}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lines · Order {readiness.order_number ?? '—'}</DialogTitle>
          <DialogDescription>
            {all
              ? `All ${readiness.lines_total} ready.`
              : `${readiness.lines_ready} of ${readiness.lines_total} ready, the ones not ready first.`}
          </DialogDescription>
        </DialogHeader>
        {/* A phone's drawer scrolls as one; a box scrolling inside it would fight the swipe. */}
        <div className='scrollport rounded-lg border border-border md:max-h-96 md:overflow-y-auto'>
          <OrderLines order={order} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
