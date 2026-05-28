import type { Header } from '@tanstack/react-table'

import { DEFAULT_LIMIT } from '../filters/pagination'

import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'

interface DataTableSkeletonProps<T> {
  headers: Header<T, unknown>[]
  rowsCount?: number
}

export const DataTableSkeleton = <T,>({
  headers,
  rowsCount = DEFAULT_LIMIT
}: DataTableSkeletonProps<T>) => {
  return Array.from({ length: rowsCount }).map((_, index) => (
    <TableRow
      key={`skeleton_${index}`}
      className='h-(--table-row-height)'
    >
      {headers.map((header, headerIndex) => (
        <TableCell
          className='skeleton py-1'
          key={`skeleton_${index}_${header.id || headerIndex}`}
          style={{
            width: header.getSize()
          }}
        >
          <Skeleton className='h-(--table-row-height) w-full' />
        </TableCell>
      ))}
    </TableRow>
  ))
}
