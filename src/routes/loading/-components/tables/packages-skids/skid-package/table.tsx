import {
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { packagesColumns } from './columns'
import type { Package } from '@/api/packages/schema'
import { DataTable } from '@/components/common/data-table'
import type { DataTableProps } from '@/components/common/data-table/types'
import { OriginItemsTable } from '@/components/common/origin-items/table'

export const SkidPackageTable = ({
  data,
  isLoading,
  columnVisibility
}: DataTableProps<Package>) => {
  // const { sorting, setSorting } = useTableSorting({
  //   id: 'crea_date',
  //   desc: true
  // })

  const table = useReactTable({
    data,
    columns: packagesColumns,

    state: {
      // sorting,
      columnVisibility
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // onSortingChange: setSorting,
    getRowCanExpand: (row) => row.original?.package_items?.length > 0,
    getRowId: (row) => row.id?.toString()
  })

  return (
    <DataTable
      className='[&_thead]:z-9'
      table={table}
      isLoading={isLoading}
      renderSubComponent={(row) => {
        const originItems = row.original.package_items.flatMap((item) => {
          return { ...item.origin_item, id: item.id + item.origin_item.id }
        })

        return (
          <OriginItemsTable
            data={originItems}
            columnVisibility={{
              wrapped_from: false,
              remanufacturing_from_stock_qty: false,
              remanufacturing_qty: false,
              pull_from_stock: false,
              left_to_wrap: false,
              order: false,
              customer: false,
              status: false,
              origin_item_actions: false,
              flow: false,
              pfs: false,
              category: false,
              production_date: false,
              on_hand: false,
              comments: true
            }}
          />
        )
      }}
    />
  )
}
