import { useColumnOrder, type ColumnTable } from '@/components/table/column-order'
import { NoteButton, type NoteState } from '@/components/note-button'
import { OrderNoteDialog } from '@/components/order-note-dialog'
import { PriorityPill } from '@/components/priority-pill'
import { PrioritySelect } from '@/components/priority-select'
import { QueryError } from '@/components/query-error'
import { SelectionBar } from '@/components/selection-bar'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { CalendarDays, ChevronRight, MapPin, Truck } from 'lucide-react'
import { Fragment, useState } from 'react'
import { toast } from '@/components/ui/toast'
import {
  UNSCHEDULED_PAGE,
  notesOf,
  orderPackagesQuery,
  prioritiesQuery,
  shippingDepartmentQuery,
  unscheduledQuery,
  useSetOrderNoteRead,
  useSetShippingPriority,
  type UnscheduledOrder
} from '../api'
import { formatLength, formatWeight, mapUrl } from '../lib/format'
import { OrderLines, ReadyCount } from './order-readiness'
import { ScheduleDialog } from './schedule-dialog'
import { ShipDateFilter, type ShipDates } from './ship-date-filter'

// The checkbox and the expander are not listed: they stay first.
const SERVICE_COLUMNS = 2

// Sized to the widest value plus the cell's padding, so only the free text — Customer, which takes
// what is left — truncates. Saved under its own key: the board's Unscheduled tab has one too.
const COLUMNS: ColumnTable = {
  table: 'shipping-unscheduled',
  columns: [
    { key: 'entry', label: 'Entry', width: 'w-40' },
    { key: 'ship', label: 'Ship', width: 'w-40' },
    { key: 'order', label: 'Order #', width: 'w-32', card: 'title' },
    { key: 'customer', label: 'Customer', align: 'start', card: 'subtitle' },
    { key: 'address', label: 'Address', width: 'w-56', align: 'start' },
    { key: 'city', label: 'City', width: 'w-40', align: 'start' },
    { key: 'map', label: 'Map', width: 'w-16' },
    { key: 'weight', label: 'Weight', width: 'w-36' },
    { key: 'longest', label: 'Longest Length', width: 'w-44' },
    { key: 'shipvia', label: 'Ship Via', width: 'w-24' },
    { key: 'priority', label: 'Priority', width: 'w-32' },
    { key: 'ready', label: 'Ready', width: 'w-32' },
    { key: 'notes', label: 'Notes', width: 'w-20' }
  ]
}

/** An order's packages, where they stand and what they weigh. */
const OrderPackages = ({ order }: { order: string }) => {
  const { data: packages, isPending } = useQuery(orderPackagesQuery(order))
  if (isPending) return <p className='px-3 py-3 text-sm text-muted-foreground'>Loading packages…</p>
  if (!packages?.length)
    return <p className='px-3 py-3 text-sm text-muted-foreground'>No packages made yet.</p>
  return (
    <ul className='divide-y divide-border'>
      {packages.map(pkg => (
        <li
          key={pkg.package_id}
          className='flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm'
        >
          <span className='w-40 font-mono max-md:w-auto'>{pkg.name ?? pkg.package_id}</span>
          <span className='w-32 font-mono text-muted-foreground max-md:w-auto'>
            {pkg.location ?? '—'}
          </span>
          <span className='font-mono'>{formatWeight(pkg.weight)}</span>
        </li>
      ))}
    </ul>
  )
}

type PriorityCellProps = { order: UnscheduledOrder; departmentId: number | undefined }

/** The order's priority in Shipping, set without losing the ticks p3 (560,202). */
const PriorityCell = ({ order, departmentId }: PriorityCellProps) => {
  const { data: priorities } = useQuery(prioritiesQuery(departmentId))
  const mutation = useSetShippingPriority(order.order)
  // The row carries no colour; the department's list does.
  const current = order.priority && {
    ...order.priority,
    color: priorities?.find(priority => priority.id === order.priority?.id)?.color ?? null
  }

  if (departmentId === undefined) return <PriorityPill priority={current} />

  return (
    <PrioritySelect
      priorities={priorities}
      current={current}
      onChange={priority => mutation.mutate({ departmentId, priority })}
    />
  )
}

type UnscheduledTabProps = {
  search: string | undefined
  shipDates: ShipDates
  onShipDatesChange: (next: ShipDates) => void
}

/**
 * The delivery orders still without a ship date and a truck p3 (605,182). Ticking some opens the
 * Schedule window; selections survive expanding, searching and the map p3 (560,202).
 */
export const UnscheduledTab = ({ search, shipDates, onShipDatesChange }: UnscheduledTabProps) => {
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInfiniteQuery(unscheduledQuery({ search: search ?? '', ...shipDates }))
  const count = data?.pages[0]?.count ?? 0
  // Kept by order, not by row on screen: a search that hides a ticked order leaves it scheduled.
  const [selected, setSelected] = useState<ReadonlyMap<string, UnscheduledOrder>>(() => new Map())
  const [scheduling, setScheduling] = useState(false)
  // One order open at a time: opening another folds the last.
  const [expanded, setExpanded] = useState<string | null>(null)
  const [noteOrder, setNoteOrder] = useState<UnscheduledOrder | null>(null)
  const orders = data?.pages.flatMap(page => page.results) ?? []
  const picked = [...selected.values()]
  const { data: department } = useQuery(shippingDepartmentQuery)
  // The salesman's notes come on the rows, checked off here as on the boards p3 (592,338).
  const notes = notesOf(orders)
  const setRead = useSetOrderNoteRead()
  const columns = useColumnOrder(COLUMNS)
  const noteState = ({ note }: UnscheduledOrder): NoteState => {
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
      <div className='flex flex-wrap items-center gap-2.5'>
        <span className='text-sm text-muted-foreground'>
          {picked.length ? (
            <>
              <b className='font-semibold text-foreground'>{picked.length}</b> selected
            </>
          ) : (
            <>
              <b className='font-semibold text-foreground'>{count}</b> order
              {count === 1 ? '' : 's'} to ship
            </>
          )}
        </span>
        {/* A phone gives the count its own line and halves the next one between the filter and Schedule. */}
        <div className='flex items-center gap-2.5 max-md:w-full md:contents'>
          <ShipDateFilter className='max-md:flex-1' {...shipDates} onChange={onShipDatesChange} />
          <div className='ml-auto max-md:flex-1'>
            <SelectionBar active={picked.length > 0}>
              <Button disabled={!picked.length} onClick={() => setScheduling(true)}>
                <CalendarDays data-icon='inline-start' />
                Schedule{picked.length ? ` (${picked.length})` : ''}
              </Button>
            </SelectionBar>
          </div>
        </div>
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
                : shipDates.shipFrom || shipDates.shipTo
                  ? 'No delivery waits for a truck on these ship dates.'
                  : 'Every delivery has a ship date and a truck.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          {/* Sized to the widest value plus the cell's 32px padding — a date with a two-digit day, a
              five-figure weight — so only the free text truncates. The fixed columns take 1748px; the
              floor leaves the Customer room to read. */}
          <Table data-cards className='min-w-498 table-fixed'>
            <colgroup>
              <col className='w-10' />
              {/* The cell's padding, its column rule and the 28px expand button, which the cell would clip. */}
              <col className='w-16' />
              {columns.cols}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead />
                {columns.headers}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows />
              ) : (
                orders.map(order => {
                  const open = expanded === order.order
                  const name = order.order_number ?? order.order
                  return (
                    <Fragment key={order.order}>
                      <TableRow data-state={selected.has(order.order) ? 'selected' : undefined}>
                        <TableCell card='lead'>
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
                        <TableCell card='trail'>
                          {/* Opening an order leaves the ticks as they are p3 (560,202). */}
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`${open ? 'Collapse' : 'Expand'} order ${name}`}
                            aria-expanded={open}
                            onClick={() => setExpanded(open ? null : order.order)}
                          >
                            <ChevronRight
                              className={cn(
                                'text-muted-foreground transition-transform',
                                open && 'rotate-90'
                              )}
                            />
                          </Button>
                        </TableCell>
                        {columns.cells({
                          entry: <TableCell>{formatDate(order.entry_date)}</TableCell>,
                          ship: (
                            <TableCell>
                              {/* Past its ship date and not delivered p3 (605,628). */}
                              <span
                                className={cn(order.is_overdue && 'font-medium text-destructive')}
                                title={order.is_overdue ? 'Overdue' : undefined}
                              >
                                {formatDate(order.ship_date)}
                              </span>
                            </TableCell>
                          ),
                          order: (
                            <TableCell>
                              <span className='font-mono font-medium'>{name}</span>
                            </TableCell>
                          ),
                          customer: (
                            <TableCell>
                              <span className='lg:truncate'>{order.customer ?? '—'}</span>
                            </TableCell>
                          ),
                          address: (
                            <TableCell>
                              <span className='text-muted-foreground lg:truncate'>
                                {order.address ?? '—'}
                              </span>
                            </TableCell>
                          ),
                          city: (
                            <TableCell>
                              <span className='text-muted-foreground lg:truncate'>
                                {order.city ?? '—'}
                              </span>
                            </TableCell>
                          ),
                          map: (
                            <TableCell>
                              {order.address ? (
                                <a
                                  href={mapUrl(order)}
                                  target='_blank'
                                  rel='noreferrer'
                                  aria-label={`Map of ${name}`}
                                  className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                                >
                                  <MapPin />
                                </a>
                              ) : null}
                            </TableCell>
                          ),
                          weight: (
                            <TableCell>
                              <span className='font-mono'>{formatWeight(order.weight)}</span>
                            </TableCell>
                          ),
                          longest: (
                            <TableCell>
                              <span className='font-mono'>
                                {formatLength(order.longest_length)}
                              </span>
                            </TableCell>
                          ),
                          shipvia: <TableCell>{order.ship_via ?? '—'}</TableCell>,
                          priority: (
                            <TableCell>
                              <PriorityCell order={order} departmentId={department?.id} />
                            </TableCell>
                          ),
                          ready: (
                            <TableCell>
                              <ReadyCount order={order.order} readiness={order} />
                            </TableCell>
                          ),
                          notes: (
                            <TableCell>
                              <NoteButton
                                state={noteState(order)}
                                label={`Order notes for ${name}`}
                                onClick={() => setNoteOrder(order)}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                      {open ? (
                        <TableRow>
                          <TableCell colSpan={SERVICE_COLUMNS + columns.order.length}>
                            {/* What can go now and what is still being made, above what is packed
                                (round 10, C1). Held at the left edge: the table is wider than the
                                screen, and anything past it would need a sideways scroll to read. */}
                            <div className='sticky left-0 flex max-w-5xl flex-col gap-3 border-l-2 border-primary/40 bg-muted/30 p-3'>
                              <section className='rounded-lg border border-border bg-card'>
                                <h3 className='border-b border-border px-3 py-2 text-sm font-medium'>
                                  Lines
                                </h3>
                                <OrderLines order={order.order} />
                              </section>
                              <section className='rounded-lg border border-border bg-card'>
                                <h3 className='border-b border-border px-3 py-2 text-sm font-medium'>
                                  Packages
                                </h3>
                                <OrderPackages order={order.order} />
                              </section>
                            </div>
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
        onSetRead={(id, read) => setRead.mutate({ order: id, read })}
        onOpenChange={open => !open && setNoteOrder(null)}
      />

      <ScheduleDialog
        verb='Schedule'
        selection={{ orders: picked.map(order => order.order), pickupIds: [] }}
        open={scheduling}
        onOpenChange={setScheduling}
        // Dispatch stays here: the tab is emptied as orders come in, and each truck is worked on
        // the Scheduled tab once they are all given a day.
        onApplied={shipDate => {
          setSelected(new Map())
          toast.add({ type: 'success', title: `Scheduled to ship ${formatLongDate(shipDate)}` })
        }}
      />
    </div>
  )
}
