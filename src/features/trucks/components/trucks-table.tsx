import { useColumnOrder, type ColumnTable } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { Truck } from '../api'
import { TruckActions } from './truck-actions'

const weightFormatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'pound',
  unitDisplay: 'short',
  maximumFractionDigits: 2
})

const formatWeight = (pounds: number | null) =>
  pounds === null ? '—' : weightFormatter.format(pounds).replace(/\blb\b/, 'lbs')

const COLUMNS: ColumnTable = {
  table: 'trucks',
  columns: [
    { key: 'name', label: 'Name', width: 'w-48', align: 'start', card: 'title' },
    { key: 'plate', label: 'Plate', width: 'w-32' },
    { key: 'weight', label: 'Max Weight', width: 'w-36' }
  ]
}

type TrucksTableProps = {
  trucks: Truck[]
  isPending: boolean
}

export const TrucksTable = ({ trucks, isPending }: TrucksTableProps) => {
  const columns = useColumnOrder(COLUMNS)

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      {/* `table-fixed` plus the widths below size the columns from the layout instead of from the
        widest cell, so they hold still between the skeleton, the data and every search. */}
      <Table data-cards className='min-w-2xl table-fixed'>
        {/* The actions column takes the leftover width, so the slack collects in front of its
          buttons instead of stretching Name into a void. */}
        <colgroup>
          {columns.cols}
          <col />
        </colgroup>
        <TableHeader>
          <TableRow>
            {columns.headers}
            <TableHead>
              {/* The column is obvious from its buttons; the label is for screen readers. */}
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows actions />
          ) : (
            trucks.map(truck => (
              <TableRow key={truck.id}>
                {columns.cells({
                  name: <TableCell>{truck.name}</TableCell>,
                  plate: (
                    <TableCell>
                      <span className='font-mono'>{truck.plate ?? '—'}</span>
                    </TableCell>
                  ),
                  weight: <TableCell>{formatWeight(truck.max_weight)}</TableCell>
                })}
                <TableCell card='trail'>
                  <TruckActions truck={truck} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
