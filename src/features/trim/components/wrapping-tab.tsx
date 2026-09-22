import { useColumnOrder } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { PackageCheck } from 'lucide-react'
import { Fragment, useState } from 'react'
import { prioritiesQuery, remanufacturingsQuery, wrappingRowsQuery, type WrappingRow } from '../api'
import { WRAPPING_TABLE } from '../lib/columns'
import { formatLongDate, today } from '../lib/format'
import { itemStatus } from '../lib/status'
import { remanState } from '../lib/wrapping'
import { LineNotesDialog } from './line-notes-dialog'
import { NoteButton } from './note-button'
import { PriorityPill } from './priority-pill'
import { RemanBadge } from './reman-badge'
import { StatusPill } from './status-pill'
import { useLineNoteState } from './use-line-note-state'
import { WrapOrder } from './wrap-order'

/** The rows arrive in the board's order — production date, then priority — so the days fall out. */
const byDay = (rows: WrappingRow[]) => {
  const days: { date: string | null; rows: WrappingRow[] }[] = []
  for (const row of rows) {
    const last = days[days.length - 1]
    if (last && last.date === row.production_date) last.rows.push(row)
    else days.push({ date: row.production_date, rows: [row] })
  }
  return days
}

/** A line whose day has passed and is still not wrapped. */
const isOverdue = (row: WrappingRow) =>
  !!row.production_date && row.production_date < today() && row.status !== 'wrapped'

type WrappingTabProps = {
  departmentId: number | undefined
}

/**
 * The station after every machine: what has been made, and what is left to wrap on it. A line leads
 * into its order, which is where packages are built — a package carries one order, never two.
 */
export const WrappingTab = ({ departmentId }: WrappingTabProps) => {
  const [order, setOrder] = useState<string | null>(null)
  const [noteLine, setNoteLine] = useState<WrappingRow | null>(null)
  const { data: rows, isPending } = useQuery(wrappingRowsQuery(departmentId, null))
  const { data: remans } = useQuery(remanufacturingsQuery)
  const noteState = useLineNoteState((rows ?? []).map(row => row.origin_item))
  // The row names its priority but not its colour, and the colour is how the list is read.
  const { data: priorities } = useQuery(prioritiesQuery(departmentId))
  const columns = useColumnOrder(WRAPPING_TABLE)

  if (order) {
    const onOrder = (rows ?? []).filter(row => row.order === order)
    if (onOrder.length)
      return <WrapOrder departmentId={departmentId} rows={onOrder} onBack={() => setOrder(null)} />
  }

  const days = byDay(rows ?? [])

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
      <Table className='min-w-5xl table-fixed'>
        <colgroup>{columns.cols}</colgroup>
        <TableHeader>
          <TableRow>{columns.headers}</TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows columns={6} />
          ) : (
            days.map(day => (
              <Fragment key={day.date ?? 'undated'}>
                {/* The date is said once, over the lines that share it. */}
                <TableRow>
                  <TableCell colSpan={7}>
                    <span className='text-xs font-semibold tracking-wider uppercase'>
                      {day.date ? formatLongDate(day.date) : '—'}
                      {day.date === today() ? ' · today' : ''}
                    </span>
                    <span className='ml-2 text-xs text-muted-foreground'>
                      {day.rows.length} line item{day.rows.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                </TableRow>

                {day.rows.map(row => {
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
                            <span className='font-mono' title={row.order_number ?? row.order}>
                              {row.order_number ?? row.order}
                            </span>
                          </TableCell>
                        ),
                        qty: (
                          <TableCell>
                            <span className='font-mono'>{row.qty_ordered}</span>
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
                            <RemanBadge remans={lineRemans} />
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
