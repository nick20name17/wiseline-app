import { useSearch } from '@tanstack/react-router'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { prioritiesColumns } from './columns'
import type { Priority } from '@/api/priorities/schema'
import { DataTable } from '@/components/common/data-table'
import type { DataTableProps } from '@/components/common/data-table/types'

export const PrirotiesTable = ({ data, isLoading, className }: DataTableProps<Priority>) => {
  const { search } = useSearch({ from: '/_settings/priorities/' })

  const table = useReactTable({
    data,
    columns: prioritiesColumns,
    state: {
      globalFilter: search
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id?.toString()
  })

  return (
    <DataTable
      className={className}
      table={table}
      isLoading={isLoading}
    />
  )
}
