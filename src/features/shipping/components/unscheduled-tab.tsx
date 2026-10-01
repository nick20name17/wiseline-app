import { NoteButton, type NoteState } from '@/components/note-button'
import { OrderNoteDialog } from '@/components/order-note-dialog'
import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
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
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { CalendarDays, ChevronRight, MapPin, Truck } from 'lucide-react'
import { Fragment, useState } from 'react'
import { toast } from '@/components/ui/toast'
import {
  UNSCHEDULED_PAGE,
  orderNotesQuery,
  orderPackagesQuery,
  unscheduledQuery,
  useSetOrderNoteRead,
  type UnscheduledOrder
} from '../api'
import { formatLength, formatWeight, mapUrl } from '../lib/format'
import { ScheduleDialog } from './schedule-dialog'

const COLUMNS = 13

/** What an expanded order holds for Shipping: its packages, where they stand and what they weigh. */
const OrderPackages = ({ order }: { order: string }) => {
  const { data: packages, isPending } = useQuery(orderPackagesQuery(order))
  if (isPending) return <p className='px-3 py-3 text-sm text-muted-foreground'>Loading packages…</p>
  if (!packages?.length)
    return <p className='px-3 py-3 text-sm text-muted-foreground'>No packages made yet.</p>
  return (
    <ul className='divide-y divide-border border-l-2 border-primary/40 bg-muted/30'>
      {packages.map(pkg => (
        <li key={pkg.package_id} className='flex items-center gap-4 px-3 py-2 text-sm'>
          <span className='w-40 font-mono'>{pkg.name ?? pkg.package_id}</span>
          <span className='w-32 font-mono text-muted-foreground'>{pkg.location ?? '—'}</span>
          <span className='font-mono'>{formatWeight(pkg.weight)}</span>
        </li>
      ))}
    </ul>
  )
}

type UnscheduledTabProps = {
  search: string | undefined
  onScheduled: (shipDate: string) => void
}

/**
 * The delivery orders still without a ship date and a truck p3 (605,182). Ticking some opens the
 * Schedule window; selections survive expanding, searching and the map p3 (560,202).
 */
export const UnscheduledTab = ({ search, onScheduled }: UnscheduledTabProps) => {
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInfiniteQuery(unscheduledQuery(search ?? ''))
  const count = data?.pages[0]?.count ?? 0
  // Kept by order, not by row on screen: a search that hides a ticked order leaves it scheduled.
  const [selected, setSelected] = useState<ReadonlyMap<string, UnscheduledOrder>>(() => new Map())
  const [scheduling, setScheduling] = useState(false)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const [noteOrder, setNoteOrder] = useState<UnscheduledOrder | null>(null)
  const orders = data?.pages.flatMap(page => page.results) ?? []
  const picked = [...selected.values()]
  // The salesman's notes, checked off here as on the boards p3 (592,338).
  const { data: notes } = useQuery(orderNotesQuery(orders.map(order => order.order)))
  const setRead = useSetOrderNoteRead()
  const noteState = (order: string): NoteState => {
    const note = notes?.[order]
    if (!note?.has_note) return 'none'
    return note.read ? 'read' : 'unread'
  }

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
              <b className='font-semibold text-foreground'>{count}</b> orders to ship
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
          {/* The fixed columns take 1320px; the floor leaves the Customer room to read. */}
          <Table className='min-w-380 table-fixed'>
            <colgroup>
              <col className='w-10' />
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
              <col className='w-20' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead />
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
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={COLUMNS} />
              ) : (
                orders.map(order => {
                  const open = expanded.has(order.order)
                  const name = order.order_number ?? order.order
                  return (
                    <Fragment key={order.order}>
                      <TableRow data-state={selected.has(order.order) ? 'selected' : undefined}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Select order ${order.order_number ?? order.order}`}
                            checked={selected.has(order.order)}
                            onCheckedChange={() =>
                              setSelected(current => {
                                const next = new Map(current)
                                if (!next.delete(order.order)) next.set(order.order, order)
                                return next
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {/* Opening an order leaves the ticks as they are p3 (560,202). */}
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`${open ? 'Collapse' : 'Expand'} order ${name}`}
                            aria-expanded={open}
                            onClick={() => setExpanded(current => toggled(current, order.order))}
                          >
                            <ChevronRight
                              className={cn(
                                'text-muted-foreground transition-transform',
                                open && 'rotate-90'
                              )}
                            />
                          </Button>
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
                          <span className='truncate text-muted-foreground'>
                            {order.address ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className='truncate text-muted-foreground'>
                            {order.city ?? '—'}
                          </span>
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
                        <TableCell>
                          <NoteButton
                            state={noteState(order.order)}
                            label={`Order notes for ${name}`}
                            onClick={() => setNoteOrder(order)}
                          />
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow>
                          <TableCell colSpan={COLUMNS}>
                            <OrderPackages order={order.order} />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {hasNextPage ? (
        <Button
          variant='outline'
          className='self-center'
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? <Spinner data-icon='inline-start' /> : null}
          Show {Math.min(UNSCHEDULED_PAGE, count - orders.length)} more of {count - orders.length}
        </Button>
      ) : null}

      <OrderNoteDialog
        order={
          noteOrder && { id: noteOrder.order, invoice: noteOrder.order_number ?? noteOrder.order }
        }
        notes={notes}
        isPending={setRead.isPending}
        onSetRead={(id, read, onDone) => setRead.mutate({ order: id, read }, { onSuccess: onDone })}
        onOpenChange={open => !open && setNoteOrder(null)}
      />

      <ScheduleDialog
        verb='Schedule'
        selection={{ orders: picked.map(order => order.order), pickupIds: [] }}
        open={scheduling}
        onOpenChange={setScheduling}
        onApplied={shipDate => {
          setSelected(new Map())
          toast.add({ type: 'success', title: `Scheduled to ship ${formatLongDate(shipDate)}` })
          onScheduled(shipDate)
        }}
      />
    </div>
  )
}
