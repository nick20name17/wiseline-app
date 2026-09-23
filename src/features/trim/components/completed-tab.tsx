import { useColumnOrder } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useState } from 'react'
import { completedOrdersQuery, type CompletedOrder } from '../api'
import { COMPLETED_TABLE } from '../lib/columns'
import { formatLongDate, formatStamp } from '../lib/format'
import { CompletedOrderDialog } from './completed-order-dialog'

type CompletedTabProps = {
  departmentId: number | undefined
}

/**
 * What this department has finished, newest first, for as long as the server keeps it. Nothing here
 * is worked on — a row is opened to answer a question about an order that has already gone.
 */
export const CompletedTab = ({ departmentId }: CompletedTabProps) => {
  const [opened, setOpened] = useState<CompletedOrder | null>(null)
  // The header search is the open orders' business: the history is read by opening a row.
  const { data: page, isPending } = useQuery(completedOrdersQuery(departmentId))
  const orders = page?.results ?? []
  const columns = useColumnOrder(COMPLETED_TABLE)

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-4'>
      {!isPending && !orders.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <History />
            </EmptyMedia>
            <EmptyTitle>No completed orders</EmptyTitle>
            <EmptyDescription>
              Orders you finish wrapping and mark complete land here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table className='min-w-5xl table-fixed'>
            <colgroup>{columns.cols}</colgroup>
            <TableHeader>
              <TableRow>{columns.headers}</TableRow>
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
                    {columns.cells({
                      ship: (
                        <TableCell>
                          <span className='text-muted-foreground'>
                            {order.ship_date ? formatLongDate(order.ship_date) : 'N/A'}
                          </span>
                        </TableCell>
                      ),
                      prod: (
                        <TableCell>
                          <span className='text-muted-foreground'>
                            {order.production_date ? formatLongDate(order.production_date) : '—'}
                          </span>
                        </TableCell>
                      ),
                      completed: (
                        <TableCell>
                          {order.completed_at ? formatStamp(order.completed_at) : '—'}
                        </TableCell>
                      ),
                      order: (
                        <TableCell>
                          <span className='font-mono'>{order.order_number ?? order.order}</span>
                        </TableCell>
                      ),
                      customer: (
                        <TableCell>
                          <span className='truncate'>
                            {order.is_stock ? 'Stock' : (order.customer ?? '—')}
                          </span>
                        </TableCell>
                      ),
                      location: (
                        <TableCell>
                          <span className='font-mono'>{order.trim_location.join(', ') || '—'}</span>
                        </TableCell>
                      )
                    })}
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
