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
import { wrappingRowsQuery, type WrappingRow } from '../api'
import { formatDate, today } from '../lib/format'
import { itemStatus } from '../lib/status'
import { StatusPill } from './status-pill'
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

type WrappingTabProps = {
  departmentId: number | undefined
  readOnly: boolean
}

/**
 * The station after every machine: what has been made, and what is left to wrap on it. A line leads
 * into its order, which is where packages are built — a package carries one order, never two.
 */
export const WrappingTab = ({ departmentId, readOnly }: WrappingTabProps) => {
  const [order, setOrder] = useState<string | null>(null)
  const { data: rows, isPending } = useQuery(wrappingRowsQuery(departmentId, null))

  if (order) {
    const onOrder = (rows ?? []).filter(row => row.order === order)
    if (onOrder.length)
      return (
        <WrapOrder
          departmentId={departmentId}
          rows={onOrder}
          readOnly={readOnly}
          onBack={() => setOrder(null)}
        />
      )
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
        <colgroup>
          <col className='w-36' />
          <col className='w-32' />
          <col />
          <col className='w-28' />
          <col className='w-28' />
          <col className='w-32' />
          <col className='w-40' />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Line item</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Wrapped</TableHead>
            <TableHead>Left to wrap</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
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
                      {formatDate(day.date)}
                      {day.date === today() ? ' · today' : ''}
                    </span>
                    <span className='ml-2 text-xs text-muted-foreground'>
                      {day.rows.length} line item{day.rows.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                </TableRow>

                {day.rows.map(row => (
                  // The whole row leads into its order: wrapping is done an order at a time.
                  <TableRow
                    key={row.origin_item}
                    aria-label={`Wrap ${row.order_number ?? row.order}`}
                    onClick={() => setOrder(row.order)}
                  >
                    <TableCell>
                      <span className='font-mono'>{row.order_number ?? row.order}</span>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono text-muted-foreground'>{row.origin_item}</span>
                    </TableCell>
                    <TableCell>
                      <span className='truncate'>{row.description ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono'>{row.qty_ordered}</span>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono'>{row.wrapped}</span>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono'>{row.left_to_wrap}</span>
                    </TableCell>
                    <TableCell>
                      <StatusPill status={itemStatus(row.status)} />
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
