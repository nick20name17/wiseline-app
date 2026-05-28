import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

import { locationsColumns } from './columns'
import type { Location } from '@/api/locations/schema'
import { DataTable } from '@/components/common/data-table'
import type { DataTableProps } from '@/components/common/data-table/types'

export const LocationsTable = ({ data, isLoading, className }: DataTableProps<Location>) => {
  const table = useReactTable({
    data,
    columns: locationsColumns,
    getCoreRowModel: getCoreRowModel(),
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
