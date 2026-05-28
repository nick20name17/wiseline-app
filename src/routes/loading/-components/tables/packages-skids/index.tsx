import {
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { CreateSkidPopup } from '../../popups/create-skid'

import { packagesSkidsColumns } from './columns'
import { SkidPackageTable } from './skid-package/table'
import type { Package } from '@/api/packages/schema'
import type { Skids } from '@/api/skids/schema'
import { DataTable } from '@/components/common/data-table'
import type { DataTableProps } from '@/components/common/data-table/types'
import { PackageItemsTable } from '@/routes/_shipping/dispatch/-components/tables/package-items'

export const PackagesSkidsTable = ({
  data,
  isLoading,
  columnVisibility
}: DataTableProps<Package | Skids>) => {
  const table = useReactTable({
    data,
    columns: packagesSkidsColumns,
    state: {
      columnVisibility
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowCanExpand: (row) =>
      'package_items' in row.original
        ? row.original.package_items?.length > 0
        : row.original.packages.length > 0,
    getRowId: (row) => row.id?.toString()
  })

  return (
    <div className='relative h-full min-h-0 overflow-hidden rounded-md border'>
      <DataTable
        table={table}
        isLoading={isLoading}
        renderSubComponent={(row) => {
          if ('package_items' in row.original) {
            return (
              <PackageItemsTable
                className='[&_thead]:z-9!'
                data={row.original.package_items}
              />
            )
          } else {
            return (
              <SkidPackageTable
                className='[&_thead]:z-9!'
                data={row.original.packages}
              />
            )
          }
        }}
      />
      <CreateSkidPopup table={table} />
    </div>
  )
}
