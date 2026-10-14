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

type ExceptionsTableProps = {
  exceptions: DayException[]
  isPending: boolean
  /** Without it the rows are read only. */
  onSaved?: (date: string) => void
}

export const ExceptionsTable = ({ exceptions, isPending, onSaved }: ExceptionsTableProps) => (
  <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
    {/* `table-fixed` plus the widths size the columns from the layout, so they hold still between
        the skeleton, the data and every year. */}
    <Table data-cards className='min-w-2xl table-fixed'>
      <colgroup>
        <col className='w-56' />
        <col className='w-36' />
        <col className='w-80' />
        <col />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>
            <span className='sr-only'>Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          <TableSkeletonRows columns={3} />
        ) : (
          exceptions.map(exception => (
            <TableRow key={`${exception.kind}-${exception.id}`}>
              <TableCell card='subtitle'>{formatDate(exception.date)}</TableCell>
              <TableCell label='Kind'>
                <Badge variant={exception.kind === 'holiday' ? 'destructive' : 'secondary'}>
                  {KIND_LABELS[exception.kind]}
                </Badge>
              </TableCell>
              <TableCell card='title'>{exception.name}</TableCell>
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
