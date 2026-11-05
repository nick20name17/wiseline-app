import { useColumnOrder, type ColumnTable } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { formatDate } from '@/lib/days'
import { KIND_LABELS, type DayException } from '../api'
import { ExceptionActions } from './exception-actions'

const COLUMNS: ColumnTable = {
  table: 'holiday-exceptions',
  columns: [
    { key: 'date', label: 'Date', width: 'w-56', card: 'subtitle' },
    { key: 'kind', label: 'Kind', width: 'w-36' },
    { key: 'name', label: 'Name', width: 'w-80', align: 'start', card: 'title' }
  ]
}

type ExceptionsTableProps = {
  exceptions: DayException[]
  isPending: boolean
  /** Without it the rows are read only. */
  onSaved?: (date: string) => void
}

export const ExceptionsTable = ({ exceptions, isPending, onSaved }: ExceptionsTableProps) => {
  const columns = useColumnOrder(COLUMNS)

  return (
    <div
      data-page-table
      className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'
    >
      {/* `table-fixed` plus the widths size the columns from the layout, so they hold still between
        the skeleton, the data and every year. */}
      <Table data-cards className='min-w-2xl table-fixed'>
        <colgroup>
          {columns.cols}
          {/* The actions column takes what the others leave. */}
          <col />
        </colgroup>
        <TableHeader>
          <TableRow>
            {columns.headers}
            <TableHead>
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows actions />
          ) : (
            exceptions.map(exception => (
              <TableRow key={`${exception.kind}-${exception.id}`}>
                {columns.cells({
                  date: <TableCell>{formatDate(exception.date)}</TableCell>,
                  kind: (
                    <TableCell>
                      <Badge variant={exception.kind === 'holiday' ? 'destructive' : 'secondary'}>
                        {KIND_LABELS[exception.kind]}
                      </Badge>
                    </TableCell>
                  ),
                  name: <TableCell>{exception.name}</TableCell>
                })}
                <TableCell card='trail'>
                  {onSaved ? <ExceptionActions exception={exception} onSaved={onSaved} /> : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
