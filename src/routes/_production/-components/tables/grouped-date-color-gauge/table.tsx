import {
  type AccessorColumnDef,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { useMemo } from 'react'

import { groupedDateColorGaugeTableColumns } from './columns'
import type { OriginItem } from '@/api/origin-items/schema'
import type { Priority } from '@/api/priorities/schema'
import { DataTable } from '@/components/common/data-table'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'
import type { DataTableProps } from '@/components/common/data-table/types'
import { OriginItemsTable } from '@/components/common/origin-items/table'
import { groupBy } from '@/utils/group'

export interface FlowsTableGroup {
  key: {
    // productionDate: string | undefined
    color: string
    gauge: string | null
    priority: Priority | null
  }
  data: OriginItem[]
}

export const GroupedDateColorGaugeTable = ({ data, isLoading }: DataTableProps<OriginItem>) => {
  const groupedByDateColorGaugePriority = useMemo(
    () =>
      groupBy(data, (item) => ({
        // productionDate: item?.production_date,
        color: item?.color ?? '—',
        gauge: item?.gauge ?? '—',
        priority: item?.priority
      })) as FlowsTableGroup[],
    [data]
  )

  const remanufacturedQtyColumn: AccessorColumnDef<FlowsTableGroup> = {
    accessorKey: COLUMN_KEYS.remanufactured,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Remanufactured'
      />
    ),
    cell: ({ row }) => {
      const remanufacturingQty = row.original.data.reduce((acc, originiItem) => {
        return acc + originiItem.remanufacturing_qty + originiItem.remanufacturing_from_stock_qty
      }, 0)
      return remanufacturingQty ?? '—'
    },
    sortingFn: (rowA, rowB) => {
      const getRemanufacturedQty = (row: typeof rowA | typeof rowB) => {
        const remanufacturingQty = row.original.data.reduce((acc, originiItem) => {
          return acc + originiItem.remanufacturing_qty + originiItem.remanufacturing_from_stock_qty
        }, 0)
        return remanufacturingQty ?? 0
      }
      return getRemanufacturedQty(rowA) - getRemanufacturedQty(rowB)
    },
    size: 700
  }

  const table = useReactTable({
    data: groupedByDateColorGaugePriority,
    columns: groupedDateColorGaugeTableColumns.concat([remanufacturedQtyColumn]),
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowCanExpand: (row) => row.original.data.length > 0
  })

  return (
    <DataTable
      isLoading={isLoading}
      renderSubComponent={(row) => {
        return (
          <OriginItemsTable
            isLoading={false}
            columnVisibility={{
              ship_date: false,
              production_date: false,
              customer: false,
              left_to_wrap: false,
              pfs: false,
              wrapped_from: false,
              remanufacturing_from_stock_qty: false,
              remanufacturing_qty: false,
              category: false,
              on_hand: false,
              pull_from_stock: false,
              origin_item_actions: false,
              remanufactured: true,
              comments: true,
              status_complete: true
            }}
            data={row.original.data}
          />
        )
      }}
      table={table}
    />
  )
}
