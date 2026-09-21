import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { Truck } from '../api'
import { formatLength, formatVolume, formatWeight } from '../lib/format'
import { TruckActions } from './truck-actions'

const COLUMNS = [
  { key: 'name', label: 'Name', render: (truck: Truck) => truck.name },
  { key: 'max_height', label: 'Max Height', render: (t: Truck) => formatLength(t.max_height) },
  { key: 'max_length', label: 'Max Length', render: (t: Truck) => formatLength(t.max_length) },
  { key: 'max_weight', label: 'Max Weight', render: (t: Truck) => formatWeight(t.max_weight) },
  { key: 'max_volume', label: 'Max Volume', render: (t: Truck) => formatVolume(t.max_volume) },
  { key: 'max_width', label: 'Max Width', render: (t: Truck) => formatLength(t.max_width) }
] as const

const SKELETON_ROWS = 5

type TrucksTableProps = {
  trucks: Truck[]
  isPending: boolean
}

export const TrucksTable = ({ trucks, isPending }: TrucksTableProps) => (
  <div className='overflow-hidden rounded-xl border border-border bg-card shadow-xs'>
    {/* `table-fixed` plus the widths below size the columns from the layout instead of from the
        widest cell, so they hold still between the skeleton, the data and every search. The table
        keeps a floor width and scrolls instead of squeezing the measurements. */}
    <Table className='min-w-4xl table-fixed'>
      {/* One entry per column above, in the same order, then the actions column. That last one
          is left to absorb the leftover width, so the slack collects in front of the trailing
          buttons instead of stretching Name into a void. */}
      <colgroup>
        <col className='w-48' />
        <col className='w-32' />
        <col className='w-32' />
        <col className='w-32' />
        <col className='w-36' />
        <col className='w-32' />
        <col />
      </colgroup>
      <TableHeader>
        <TableRow>
          {COLUMNS.map(column => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          <TableHead>
            {/* The column is obvious from its buttons; the label is for screen readers. */}
            <span className='sr-only'>Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending
          ? Array.from({ length: SKELETON_ROWS }, (_, row) => (
              <TableRow key={row}>
                {COLUMNS.map(column => (
                  <TableCell key={column.key}>
                    <Skeleton className='h-4 w-24' />
                  </TableCell>
                ))}
                <TableCell>
                  {/* Sized and placed like the buttons they stand in for, so nothing moves when
                      the rows arrive. */}
                  <div className='flex justify-end gap-1'>
                    <Skeleton className='size-7' />
                    <Skeleton className='size-7' />
                  </div>
                </TableCell>
              </TableRow>
            ))
          : trucks.map(truck => (
              <TableRow key={truck.id}>
                {COLUMNS.map(column => (
                  <TableCell key={column.key}>{column.render(truck)}</TableCell>
                ))}
                <TableCell>
                  <TruckActions truck={truck} />
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  </div>
)
