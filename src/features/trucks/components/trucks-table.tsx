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
import { formatWeight } from '../lib/format'
import { TruckActions } from './truck-actions'

const SKELETON_ROWS = 5

type TrucksTableProps = {
  trucks: Truck[]
  isPending: boolean
}

export const TrucksTable = ({ trucks, isPending }: TrucksTableProps) => (
  <div className='overflow-hidden rounded-xl border border-border bg-card shadow-xs'>
    {/* `table-fixed` plus the widths below size the columns from the layout instead of from the
        widest cell, so they hold still between the skeleton, the data and every search. */}
    <Table className='min-w-2xl table-fixed'>
      {/* The actions column takes the leftover width, so the slack collects in front of its
          buttons instead of stretching Name into a void. */}
      <colgroup>
        <col className='w-64' />
        <col className='w-48' />
        <col />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Max Weight</TableHead>
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
                <TableCell>
                  <Skeleton className='h-4 w-24' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-4 w-20' />
                </TableCell>
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
                <TableCell>{truck.name}</TableCell>
                <TableCell>{formatWeight(truck.max_weight)}</TableCell>
                <TableCell>
                  <TruckActions truck={truck} />
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  </div>
)
