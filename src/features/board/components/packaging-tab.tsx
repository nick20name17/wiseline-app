import { formatDate, formatLongDate, today } from '@/lib/days'
import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { PackageCheck } from 'lucide-react'
import { Fragment, useState } from 'react'
import { packagingQuery, prioritiesQuery, wrappingRowsQuery, type PackagingOrder } from '../api'
import { orderStatus } from '../lib/status'
import { PriorityPill } from './priority-pill'
import { StatusPill } from './status-pill'
import { WrapOrder } from './wrap-order'

const COLUMNS = 7

/** The orders arrive by Prep Date, so the days fall out of the sequence. */
const byDay = (orders: PackagingOrder[]) => {
  const days: { date: string; orders: PackagingOrder[] }[] = []
  for (const order of orders) {
    if (!order.prep_date) continue
    const last = days[days.length - 1]
    if (last?.date === order.prep_date) last.orders.push(order)
    else days.push({ date: order.prep_date, orders: [order] })
  }
  return days
}

/** «Overdue Accessories to be packaged need to be highlighted in red» p3 (1271,348). */
const isOverdue = (order: PackagingOrder) =>
  !!order.prep_date && order.prep_date < today() && order.status !== 'packaged'

type PackagingTabProps = {
  departmentId: number
}

/**
 * The scheduled orders, one list, the days apart — «A Worker should not need to select days of the
 * week» p3 (1249,187). An order leads into its bench, where its accessories are packaged.
 */
export const PackagingTab = ({ departmentId }: PackagingTabProps) => {
  const [opened, setOpened] = useState<string | null>(null)
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
  const days = byDay((orders ?? []).filter(order => order.status !== 'completed'))

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
          <EmptyTitle>Nothing to package</EmptyTitle>
          <EmptyDescription>An order lands here once it has been scheduled.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      <Table className='min-w-4xl table-fixed'>
        <colgroup>
          <col className='w-40' />
          <col className='w-36' />
          <col className='w-32' />
          <col />
          <col className='w-24' />
          <col className='w-32' />
          <col className='w-40' />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Prep Date</TableHead>
            <TableHead>Order #</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Truck</TableHead>
            <TableHead>Ship Via</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows columns={COLUMNS} />
          ) : (
            days.map(day => (
              <Fragment key={day.date}>
                {/* «a distinct line between the different days» p3 (1249,187). */}
                <TableRow data-divider>
                  <TableCell colSpan={COLUMNS}>
                    <span className='text-xs font-semibold tracking-wider uppercase'>
                      {formatLongDate(day.date)}
                      {day.date === today() ? ' · today' : ''}
                    </span>
                    <span className='ml-2 text-xs text-muted-foreground'>
                      {day.orders.length} order{day.orders.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                </TableRow>
                {day.orders.map(order => {
                  const priority = priorities?.find(entry => entry.name === order.priority)
                  const released = (rows ?? []).some(row => row.order === order.order)

                  return (
                    <TableRow
                      key={order.order}
                      aria-label={`Package ${order.order_number ?? order.order}`}
                      title={released ? 'Open the packaging bench' : 'Not on the bench yet'}
                      data-overdue={isOverdue(order) || undefined}
                      className='cursor-pointer'
                      onClick={() => setOpened(order.order)}
                    >
                      <TableCell>{formatDate(order.prep_date)}</TableCell>
                      <TableCell>
                        <span className='font-mono font-medium'>
                          {order.order_number ?? order.order}
                        </span>
                      </TableCell>
                      <TableCell>
                        {priority ? (
                          <PriorityPill priority={priority} />
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className='truncate'>{order.customer ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono text-muted-foreground'>
                          {order.truck ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className='text-muted-foreground'>{order.ship_via ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={orderStatus(order.status)} />
                      </TableCell>
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
