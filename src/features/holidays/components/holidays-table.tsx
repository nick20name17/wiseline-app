import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { formatDate } from '@/lib/days'
import type { Holiday } from '../api'
import { HolidayActions } from './holiday-actions'

type HolidaysTableProps = {
  holidays: Holiday[]
  isPending: boolean
  onSaved: (date: string) => void
}

export const HolidaysTable = ({ holidays, isPending, onSaved }: HolidaysTableProps) => (
  <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
    {/* `table-fixed` plus the widths size the columns from the layout, so they hold still between
        the skeleton, the data and every year. */}
    <Table className='min-w-2xl table-fixed'>
      <colgroup>
        <col className='w-56' />
        <col className='w-80' />
        <col />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>
            <span className='sr-only'>Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          <TableSkeletonRows columns={2} />
        ) : (
          holidays.map(holiday => (
            <TableRow key={holiday.id}>
              <TableCell>{formatDate(holiday.date)}</TableCell>
              <TableCell>{holiday.name}</TableCell>
              <TableCell>
                <HolidayActions holiday={holiday} onSaved={onSaved} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
)
