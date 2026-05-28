import { useSearch } from '@tanstack/react-router'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { trucksColumns } from './columns'
import type { Truck } from '@/api/trucks/schema'
import { DataTable } from '@/components/common/data-table'
import type { DataTableProps } from '@/components/common/data-table/types'

export const TrucksTable = ({ data, isLoading, className }: DataTableProps<Truck>) => {
  const { search } = useSearch({ from: '/_settings/trucks/' })

  const table = useReactTable({
    data,
    columns: trucksColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id?.toString(),
    state: {
      globalFilter: search
    }
  })

  return (
    <DataTable
      className={className}
      table={table}
      isLoading={isLoading}
    />
  )
}
