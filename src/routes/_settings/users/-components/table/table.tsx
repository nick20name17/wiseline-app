import { useSearch } from '@tanstack/react-router'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { usersTableColumns } from './columns'
import type { User } from '@/api/users/schema'
import { DataTable } from '@/components/common/data-table'
import type { DataTableProps } from '@/components/common/data-table/types'

export const UsersTable = ({ data, isLoading, className }: DataTableProps<User>) => {
  const { search } = useSearch({ from: '/_settings/users/' })

  const table = useReactTable({
    data,
    columns: usersTableColumns,
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
