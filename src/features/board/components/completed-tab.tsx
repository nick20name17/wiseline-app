import { formatDate } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useState } from 'react'
import { completedOrdersQuery } from '../api'
import { useBoard } from '../lib/board-context'
import { formatStamp } from '../lib/format'
import { CompletedOrderDialog } from './completed-order-dialog'
import { EbmsSyncMark } from './ebms-sync'

const Waiting = () => (
  <span
    className='text-warning'
    title='Done at the machine; waiting for the Wrapping Worker to give every package a location'
  >
    waiting...
  </span>
)

// Located, but EBMS would not complete it: no Wrapping Worker can move it on, so it says why.
const Refused = ({ error }: { error: string }) => (
  <span className='text-destructive' title={error}>
    EBMS refused
    {/* A touch screen has no hover for the title, and the why is the point. */}
    <span className='hidden pointer-coarse:inline'>: {error}</span>
  </span>
)

type CompletedTabProps = {
  departmentId: number | undefined
}

/**
 * What this department has finished, newest first, for as long as the server keeps it. Nothing here
 * is worked on — a row is opened to answer a question about an order that has already gone.
 */
export const CompletedTab = ({ departmentId }: CompletedTabProps) => {
  const { tables, pack, packsAtMachine } = useBoard()
  const [openedId, setOpenedId] = useState<string | null>(null)
  // The header search is the open orders' business: the history is read by opening a row.
  const {
    data: page,
    isPending,
    isError,
    error,
    refetch
  } = useQuery(completedOrdersQuery(departmentId))
  const orders = page?.results ?? []
  // Read from the list rather than kept, so a refetch — EBMS taking a batch sent again — shows through.
  const opened = orders.find(order => order.order === openedId) ?? null
  const columns = useColumnOrder(tables.completed)

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0'>
      {isError && !page ? (
        <QueryError
          title='The completed orders did not load'
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && !orders.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <History />
            </EmptyMedia>
            <EmptyTitle>No completed orders</EmptyTitle>
            <EmptyDescription>
              {packsAtMachine
                ? 'Orders land here once they are rolled, and complete once Wrapping locates every package.'
                : `Orders you finish ${pack.station.toLowerCase()} and mark complete land here.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          data-page-table
          className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'
        >
          <Table data-cards className='min-w-5xl table-fixed'>
            <colgroup>{columns.cols}</colgroup>
            <TableHeader>
              <TableRow>{columns.headers}</TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows />
              ) : (
                orders.map(order => (
                  // The whole row opens it: there is one thing to do with a finished order.
                  <TableRow
                    key={order.order}
                    aria-label={`Open ${order.order_number ?? order.order}`}
                    onClick={() => setOpenedId(order.order)}
                  >
                    {columns.cells({
                      ship: (
                        <TableCell>
                          <span className='text-muted-foreground'>
                            {formatDate(order.ship_date)}
                          </span>
                        </TableCell>
                      ),
                      prod: (
                        <TableCell>
                          <span className='text-muted-foreground'>
                            {order.production_date ? formatDate(order.production_date) : '—'}
                          </span>
                        </TableCell>
                      ),
                      completed: (
                        <TableCell>
                          {order.completed_at ? (
                            <span className='flex flex-wrap items-baseline gap-x-2'>
                              {formatStamp(order.completed_at)}
                              <EbmsSyncMark sync={order.ebms_sync} error={order.ebms_error} />
                            </span>
                          ) : order.status === 'rolled' ? (
                            order.complete_error ? (
                              <Refused error={order.complete_error} />
                            ) : (
                              <Waiting />
                            )
                          ) : (
                            '—'
                          )}
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
                          <span className='truncate'>
                            <span className='font-mono'>{order.trim_location.join(', ')}</span>
                            {/* Done but not located: the locations so far, and more to come. A refused
                                one is located already; Completed says why it stays. */}
                            {order.status === 'rolled' && !order.complete_error ? (
                              <>
                                {order.trim_location.length ? ', ' : null}
                                <Waiting />
                              </>
                            ) : order.trim_location.length ? null : (
                              '—'
                            )}
                          </span>
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
        onOpenChange={open => !open && setOpenedId(null)}
      />
    </div>
  )
}
