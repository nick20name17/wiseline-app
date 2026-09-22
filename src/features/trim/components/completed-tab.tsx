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
import { History } from 'lucide-react'
import { useState } from 'react'
import { completedOrdersQuery, type CompletedOrder } from '../api'
import { formatDate } from '../lib/format'
import { CompletedOrderDialog } from './completed-order-dialog'

const stamp = (iso: string | null) =>
  iso
    ? `${new Date(iso).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })} · ${new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : '—'

type CompletedTabProps = {
  departmentId: number | undefined
  search: string | undefined
}

/**
 * What this department has finished, newest first, for as long as the server keeps it. Nothing here
 * is worked on — a row is opened to answer a question about an order that has already gone.
 */
export const CompletedTab = ({ departmentId, search }: CompletedTabProps) => {
  const [opened, setOpened] = useState<CompletedOrder | null>(null)
  const { data: page, isPending } = useQuery(completedOrdersQuery(departmentId, search))
  const orders = page?.results ?? []

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <p className='text-sm text-muted-foreground'>
        <span className='font-medium text-foreground'>{page?.count ?? 0}</span> completed in the
        past {page?.window_days ?? 90} days
      </p>

      {!isPending && !orders.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <History />
            </EmptyMedia>
            <EmptyTitle>Nothing completed</EmptyTitle>
            <EmptyDescription>
              {search
                ? `Nothing matches “${search}”.`
                : 'An order lands here once every trim on it has been wrapped and packed.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table className='min-w-5xl table-fixed'>
            <colgroup>
              <col className='w-44' />
              <col className='w-44' />
              <col className='w-60' />
              <col className='w-36' />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Ship Date</TableHead>
                <TableHead>Production Date</TableHead>
                <TableHead>Completed Date &amp; Time</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={4} />
              ) : (
                orders.map(order => (
                  // The whole row opens it: there is one thing to do with a finished order.
                  <TableRow
                    key={order.order}
                    aria-label={`Open ${order.order_number ?? order.order}`}
                    onClick={() => setOpened(order)}
                  >
                    <TableCell>
                      <span className='text-muted-foreground'>{formatDate(order.ship_date)}</span>
                    </TableCell>
                    <TableCell>{formatDate(order.production_date)}</TableCell>
                    <TableCell>{stamp(order.completed_at)}</TableCell>
                    <TableCell>
                      <span className='font-mono'>{order.order_number ?? order.order}</span>
                    </TableCell>
                    <TableCell>
                      <span className='truncate'>{order.customer ?? 'Stock'}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CompletedOrderDialog
        departmentId={departmentId}
        order={opened}
        onOpenChange={open => !open && setOpened(null)}
      />
    </div>
  )
}
