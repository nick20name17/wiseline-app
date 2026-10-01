import { useBoard } from '../lib/board-context'
import { byDay, formatLongDate, today } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { Package, PackageCheck } from 'lucide-react'
import { Fragment, useState } from 'react'
import {
  prioritiesQuery,
  releasedOrdersQuery,
  remanufacturingsQuery,
  wrappingRowsQuery,
  type WrappingRow
} from '../api'
import { machineByLine, rowsOnMachine, type MachineTab } from '../lib/machines'
import { itemStatus } from '../lib/status'
import { remanState } from '../lib/wrapping'
import { Figure } from './figure'
import { LineNotesDialog } from './line-notes-dialog'
import { NoteButton } from '@/components/note-button'
import { PriorityPill } from './priority-pill'
import { RemanBadge, RemanNotApplicable } from './reman-badge'
import { StatusPill } from './status-pill'
import { StockWrap } from './stock-wrap'
import { useLineNoteState } from './use-line-note-state'
import { WrapOrder } from './wrap-order'

/** A line whose day has passed and is still not wrapped. */
const isOverdue = (row: WrappingRow) =>
  !!row.production_date && row.production_date < today() && row.status !== 'wrapped'

type WrappingTabProps = {
  departmentId: number | undefined
  /** Rollforming's machine tab; none on a board without them. */
  machine?: MachineTab
}

/**
 * The station after every machine: what has been made, and what is left to wrap on it. A line leads
 * into its order, which is where packages are built — a package carries one order, never two.
 */
export const WrappingTab = ({ departmentId, machine }: WrappingTabProps) => {
  const [order, setOrder] = useState<string | null>(null)
  const [noteLine, setNoteLine] = useState<WrappingRow | null>(null)
  const board = useBoard()
  const {
    data: allRows,
    isPending: rowsPending,
    isError,
    error,
    refetch
  } = useQuery(wrappingRowsQuery(departmentId, null))
  // A Wrapping row names no machine; the released order it comes from does p2 (541,730).
  const { data: released, isPending: releasedPending } = useQuery({
    ...releasedOrdersQuery(board.name, undefined),
    enabled: machine !== undefined
  })
  const rows =
    allRows && machine !== undefined
      ? rowsOnMachine(allRows, machineByLine(released?.results ?? []), machine)
      : allRows
  const isPending = rowsPending || (machine !== undefined && releasedPending)
  const { data: remans } = useQuery(remanufacturingsQuery(departmentId))
  const noteState = useLineNoteState((rows ?? []).map(row => row.origin_item))
  // The row names its priority but not its colour, and the colour is how the list is read.
  const { data: priorities } = useQuery(prioritiesQuery(departmentId))
  const columns = useColumnOrder(board.tables.wrapping)

  if (order) {
    const onOrder = (rows ?? []).filter(row => row.order === order)
    const back = () => setOrder(null)
    // A stock order opens its Stock window instead of the package modal.
    if (onOrder.length)
      return onOrder[0]?.is_stock ? (
        <StockWrap departmentId={departmentId} rows={onOrder} onBack={back} />
      ) : (
        <WrapOrder departmentId={departmentId} rows={onOrder} onBack={back} />
      )
  }

  const days = byDay(rows ?? [], row => row.production_date)

  if (isError && !rows)
    return (
      <QueryError
        title='The wrapping list did not load'
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
          <EmptyTitle>Nothing to wrap</EmptyTitle>
          <EmptyDescription>
            A line item lands here once its order has been released to production.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      {/* Wide enough for the fixed columns and a Description still worth reading. */}
      <Table className='min-w-7xl table-fixed'>
        <colgroup>{columns.cols}</colgroup>
        <TableHeader>
          <TableRow>{columns.headers}</TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows columns={board.tables.wrapping.columns.length} />
          ) : (
            days.map(day => (
              <Fragment key={day.date ?? 'undated'}>
                {/* The date is said once, over the lines that share it. */}
                <TableRow>
                  <TableCell colSpan={board.tables.wrapping.columns.length}>
                    <span className='text-xs font-semibold tracking-wider uppercase'>
                      {day.date ? formatLongDate(day.date) : '—'}
                      {day.date === today() ? ' · today' : ''}
                    </span>
                    <span className='ml-2 text-xs text-muted-foreground'>
                      {day.items.length} line item{day.items.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                </TableRow>

                {day.items.map(row => {
                  const lineRemans = remans?.get(row.origin_item) ?? []

                  return (
                    // The whole row leads into its order: wrapping is done an order at a time.
                    <TableRow
                      key={row.origin_item}
                      aria-label={`Wrap ${row.order_number ?? row.order}`}
                      title='Open wrapping detail'
                      // A late line outranks its remake: it stays red rather than orange or green.
                      data-overdue={isOverdue(row) || undefined}
                      data-reman={isOverdue(row) ? undefined : remanState(lineRemans)}
                      onClick={() => setOrder(row.order)}
                    >
                      {columns.cells({
                        order: (
                          <TableCell>
                            {/* The list is grouped by production date, so the stock mark rides
                                with the order p1 (755,283). */}
                            <span className='flex items-center gap-1.5'>
                              <span className='font-mono' title={row.order_number ?? row.order}>
                                {row.order_number ?? row.order}
                              </span>
                              {row.is_stock ? (
                                <Package
                                  className='size-3.5 shrink-0 text-muted-foreground'
                                  aria-label='Stock order'
                                />
                              ) : null}
                            </span>
                          </TableCell>
                        ),
                        customer: (
                          <TableCell>
                            <span className='truncate'>{row.customer ?? '—'}</span>
                          </TableCell>
                        ),
                        qty: (
                          <TableCell>
                            <span className='font-mono'>{row.qty_ordered}</span>
                          </TableCell>
                        ),
                        stock: (
                          <TableCell>
                            <Figure value={row.from_stock || null} />
                          </TableCell>
                        ),
                        pid: (
                          <TableCell>
                            <span className='font-mono'>{row.product_id ?? '—'}</span>
                          </TableCell>
                        ),
                        priority: (
                          <TableCell>
                            {/* The list is read by priority before it is read by date. */}
                            {row.priority ? (
                              <PriorityPill
                                priority={
                                  priorities?.find(priority => priority.name === row.priority) ?? {
                                    id: 0,
                                    name: row.priority,
                                    color: null,
                                    position: null,
                                    department: null
                                  }
                                }
                              />
                            ) : (
                              <span className='text-muted-foreground'>—</span>
                            )}
                          </TableCell>
                        ),
                        remfg: (
                          <TableCell>
                            {row.is_bypassed ? (
                              <RemanNotApplicable />
                            ) : (
                              <RemanBadge remans={lineRemans} />
                            )}
                          </TableCell>
                        ),
                        status: (
                          <TableCell>
                            <StatusPill status={itemStatus(row.status)} />
                          </TableCell>
                        ),
                        desc: (
                          <TableCell>
                            <span className='truncate'>{row.description ?? '—'}</span>
                          </TableCell>
                        ),
                        notes: (
                          <TableCell onClick={event => event.stopPropagation()}>
                            <NoteButton
                              state={noteState(row.origin_item)}
                              label={`Line notes for ${row.origin_item}`}
                              onClick={() => setNoteLine(row)}
                            />
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

      <LineNotesDialog
        originItem={noteLine?.origin_item ?? null}
        productId={noteLine?.description ?? ''}
        onOpenChange={open => !open && setNoteLine(null)}
      />
    </div>
  )
}
