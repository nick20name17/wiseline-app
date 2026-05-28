import { useSearch } from '@tanstack/react-router'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { warehousesColumns } from './columns'
import type { Warehouse } from '@/api/warehouses/schema'
import { DataTable } from '@/components/common/data-table'
import type { DataTableProps } from '@/components/common/data-table/types'

export const WarehousesTable = ({ data, isLoading, className }: DataTableProps<Warehouse>) => {
  const { search } = useSearch({ from: '/_settings/warehouses/' })

  const table = useReactTable({
    data,
    columns: warehousesColumns,
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
