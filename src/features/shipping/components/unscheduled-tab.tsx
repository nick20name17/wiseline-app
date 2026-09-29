import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { formatDate, formatLongDate } from '@/lib/days'
import { toggled } from '@/lib/sets'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, MapPin, Truck } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/components/ui/toast'
import { unscheduledQuery } from '../api'
import { formatLength, formatWeight, mapUrl } from '../lib/format'
import { ScheduleDialog } from './schedule-dialog'

// Every open delivery in EBMS is a long list; it is read a page at a time.
const PAGE = 100

type UnscheduledTabProps = {
  search: string | undefined
  onScheduled: (shipDate: string) => void
}

/**
 * The delivery orders still without a ship date and a truck p3 (605,182). Ticking some opens the
 * Schedule window; selections survive expanding, searching and the map p3 (560,202).
 */
export const UnscheduledTab = ({ search, onScheduled }: UnscheduledTabProps) => {
  const [limit, setLimit] = useState(PAGE)
  const { data, isPending, isError, error, refetch } = useQuery(
    unscheduledQuery(search ?? '', limit)
  )
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [scheduling, setScheduling] = useState(false)
  const orders = data?.results ?? []
  const picked = orders.filter(order => selected.has(order.order))

  if (isError && !data)
    return (
      <QueryError
        title='The orders to ship did not load'
        error={error}
        onRetry={() => void refetch()}
      />
    )

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-3.5'>
      <div className='flex items-center gap-2.5'>
        <span className='text-sm text-muted-foreground'>
          {picked.length ? (
            <>
              <b className='font-semibold text-foreground'>{picked.length}</b> selected
            </>
          ) : (
            <>
              <b className='font-semibold text-foreground'>{data?.count ?? 0}</b> orders to ship
            </>
          )}
        </span>
        <Button className='ml-auto' disabled={!picked.length} onClick={() => setScheduling(true)}>
          <CalendarDays data-icon='inline-start' />
          Schedule{picked.length ? ` (${picked.length})` : ''}
        </Button>
      </div>

      {!isPending && !orders.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Truck />
            </EmptyMedia>
            <EmptyTitle>Nothing to ship</EmptyTitle>
            <EmptyDescription>
              {search
                ? `Nothing matches “${search}”.`
                : 'Every delivery has a ship date and a truck.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table className='min-w-6xl table-fixed'>
            <colgroup>
              <col className='w-10' />
              <col className='w-36' />
              <col className='w-36' />
              <col className='w-28' />
              <col />
              <col className='w-56' />
              <col className='w-32' />
              <col className='w-14' />
              <col className='w-28' />
              <col className='w-36' />
              <col className='w-24' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Entry</TableHead>
                <TableHead>Ship</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Map</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Longest Length</TableHead>
                <TableHead>Ship Via</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={10} />
              ) : (
                orders.map(order => (
                  <TableRow
                    key={order.order}
                    data-state={selected.has(order.order) ? 'selected' : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        aria-label={`Select order ${order.order_number ?? order.order}`}
                        checked={selected.has(order.order)}
                        onCheckedChange={() =>
                          setSelected(current => toggled(current, order.order))
                        }
                      />
                    </TableCell>
                    <TableCell>{formatDate(order.entry_date)}</TableCell>
                    <TableCell>{formatDate(order.ship_date)}</TableCell>
                    <TableCell>
                      <span className='font-mono font-medium'>
                        {order.order_number ?? order.order}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className='truncate'>{order.customer ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className='truncate text-muted-foreground'>{order.address ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className='truncate text-muted-foreground'>{order.city ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      {order.address ? (
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          render={
                            <a
                              href={mapUrl(order.address, order.city)}
                              target='_blank'
                              rel='noreferrer'
                              aria-label={`Map of ${order.order_number ?? order.order}`}
                            />
                          }
                        >
                          <MapPin />
                        </Button>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className='font-mono'>{formatWeight(order.weight)}</span>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono'>{formatLength(order.longest_length)}</span>
                    </TableCell>
                    <TableCell>{order.ship_via ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {data && orders.length < data.count ? (
        <Button variant='outline' className='self-center' onClick={() => setLimit(limit + PAGE)}>
          Show {Math.min(PAGE, data.count - orders.length)} more of {data.count - orders.length}
        </Button>
      ) : null}

      <ScheduleDialog
        orders={picked}
        open={scheduling}
        onOpenChange={setScheduling}
        onApplied={shipDate => {
          setSelected(new Set())
          toast.add({ type: 'success', title: `Scheduled to ship ${formatLongDate(shipDate)}` })
          onScheduled(shipDate)
        }}
      />
    </div>
  )
}
