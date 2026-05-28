'use no memo'

import {
  type Table,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { AssignTruckPopup } from '../../popups/assign-truck'
import { PackageItemsTable } from '../package-items'

import { packagesColumns } from './columns'
import type { Package } from '@/api/packages/schema'
import type { Skids } from '@/api/skids/schema'
import { DataTable } from '@/components/common/data-table'
import type { DataTableProps } from '@/components/common/data-table/types'
import { cn } from '@/lib/utils'
import { LoadPopup } from '@/routes/_shipping/shipping/-components/popups/load'

export const PackagesTable = ({
  data,
  isLoading,
  className,
  columnVisibility = {
    load_checkbox: false
  },
  popup = 'assign-truck'
}: DataTableProps<Package> & {
  popup?: 'assign-truck' | 'load'
}) => {
  const table = useReactTable({
    data,
    columns: packagesColumns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnVisibility
    },
    getRowId: (row) => row.id?.toString(),
    getRowCanExpand: (row) => row.original?.package_items?.length > 0
  })

  return (
    <div className='relative h-full min-h-0 overflow-hidden rounded-md border'>
      <DataTable
        table={table}
        className={cn(className)}
        isLoading={isLoading}
        renderSubComponent={(row) => {
          return <PackageItemsTable data={row.original.package_items ?? []} />
        }}
      />
      {popup === 'assign-truck' ? <AssignTruckPopup table={table} /> : null}
      {popup === 'load' ? <LoadPopup table={table as Table<Package | Skids>} /> : null}
    </div>
  )
}
