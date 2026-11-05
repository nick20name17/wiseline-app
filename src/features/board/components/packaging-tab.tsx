import { byDay, formatDate, formatLongDate, today } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { PackageCheck } from 'lucide-react'
import { Fragment, useState } from 'react'
import { packagingQuery, prioritiesQuery, wrappingRowsQuery, type PackagingOrder } from '../api'
import { PACKAGING_TABLE } from '../lib/columns'
import { matchesSearch } from '../lib/search'
import { orderStatus } from '@/lib/status'
import { matchesWrapSearch } from '../lib/wrapping'
import { PriorityPill } from '@/components/priority-pill'
import { StatusPill } from '@/components/status-pill'
import { WrapOrder } from './wrap-order'

/** «Overdue Accessories to be packaged need to be highlighted in red» p3 (1271,348). */
const isOverdue = (order: PackagingOrder) =>
  !!order.prep_date && order.prep_date < today() && order.status !== 'packaged'

type PackagingTabProps = {
  search: string | undefined
  departmentId: number
}

/**
 * The scheduled orders, one list, the days apart — «A Worker should not need to select days of the
 * week» p3 (1249,187). An order leads into its bench, where its accessories are packaged.
 */
export const PackagingTab = ({ search, departmentId }: PackagingTabProps) => {
  const [opened, setOpened] = useState<string | null>(null)
  const columns = useColumnOrder(PACKAGING_TABLE)
  const {
    data: orders,
    isPending,
    isError,
    error,
    refetch
  } = useQuery(packagingQuery(departmentId))
  const { data: rows } = useQuery(wrappingRowsQuery(departmentId, null))
  // The row names its priority but not its colour, and the colour is how the list is read.
  const { data: priorities } = useQuery(prioritiesQuery(departmentId))

  if (opened) {
    const onOrder = (rows ?? []).filter(row => row.order === opened)
    if (onOrder.length)
      return <WrapOrder departmentId={departmentId} rows={onOrder} onBack={() => setOpened(null)} />
  }

  // A completed order has left for Completed Orders p3 (1263,354).
  // An order without a Prep Date is not scheduled, whatever the list says.
  const open = (orders ?? []).filter(
    (order): order is PackagingOrder & { prep_date: string } =>
      !!order.prep_date && order.status !== 'completed'
  )
  // An order is found by its own fields or by any of its lines on the bench.
  const days = byDay(
    open.filter(
      order =>
        matchesSearch(search, order.order, order.order_number, order.customer) ||
        rows?.some(row => row.order === order.order && matchesWrapSearch(row, search))
    ),
    order => order.prep_date
  )
  const onBench = new Set(rows?.map(row => row.order))
  const priorityOf = new Map(priorities?.map(entry => [entry.name, entry]))

  if (isError && !orders)
    return (
      <QueryError
        title='The packaging list did not load'
        error={error}
        onRetry={() => void refetch()}
      />
    )

  if (!isPending && !days.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <PackageCheck />
          </EmptyMedia>
          <EmptyTitle>{open.length ? 'No orders match' : 'Nothing to package'}</EmptyTitle>
          <EmptyDescription>
            {open.length
              ? `No order on Packaging matches «${search?.trim()}».`
              : 'An order lands here once it has been scheduled.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div
      data-page-table
      className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'
    >
      <Table data-cards className='min-w-4xl table-fixed'>
        <colgroup>{columns.cols}</colgroup>
        <TableHeader>
          <TableRow>{columns.headers}</TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows />
          ) : (
            days.map(day => (
              <Fragment key={day.date}>
                {/* «a distinct line between the different days» p3 (1249,187). */}
                <TableRow data-divider>
                  <TableCell colSpan={columns.order.length}>
                    <span className='text-xs font-semibold tracking-wider uppercase'>
                      {formatLongDate(day.date)}
                      {day.date === today() ? ' · today' : ''}
                    </span>
                    <span className='ml-2 text-xs text-muted-foreground'>
                      {day.items.length} order{day.items.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                </TableRow>
                {day.items.map(order => {
                  const priority = order.priority ? priorityOf.get(order.priority) : undefined
                  const released = onBench.has(order.order)

                  return (
                    <TableRow
                      key={order.order}
                      aria-label={`Package ${order.order_number ?? order.order}`}
                      title={released ? 'Open the packaging bench' : 'Not on the bench yet'}
                      data-overdue={isOverdue(order) || undefined}
                      // An order not on the bench has nothing to open; arming it would jump into the
                      // bench on its own once the order arrives.
                      className={released ? 'cursor-pointer' : undefined}
                      onClick={released ? () => setOpened(order.order) : undefined}
                    >
                      {columns.cells({
                        prep: <TableCell>{formatDate(order.prep_date)}</TableCell>,
                        order: (
                          <TableCell>
                            <span className='font-mono font-medium'>
                              {order.order_number ?? order.order}
                            </span>
                          </TableCell>
                        ),
                        priority: (
                          <TableCell>
                            {priority ? <PriorityPill priority={priority} /> : null}
                          </TableCell>
                        ),
                        customer: (
                          <TableCell>
                            {order.customer && <span className='truncate'>{order.customer}</span>}
                          </TableCell>
                        ),
                        truck: (
                          <TableCell>
                            {/* «If the order is not assigned to a Truck yet, then the column … would just stay
                                blank» p3 (1239,204). */}
                            <span className='font-mono text-muted-foreground'>{order.truck}</span>
                          </TableCell>
                        ),
                        shipvia: (
                          <TableCell>
                            {order.ship_via && (
                              <span className='text-muted-foreground'>{order.ship_via}</span>
                            )}
                          </TableCell>
                        ),
                        status: (
                          <TableCell>
                            <StatusPill status={orderStatus(order.status)} />
                            {/* Why the row does not open is its hover title on a desk. */}
                            {released ? null : (
                              <span className='hidden text-xs text-muted-foreground pointer-coarse:block'>
                                Not on the bench yet
                              </span>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
