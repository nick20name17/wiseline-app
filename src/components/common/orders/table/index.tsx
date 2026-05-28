import { getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useTableSorting } from '../../data-table/hooks'
import type { DataTableProps } from '../../data-table/types'
import { OriginItemsTable } from '../../origin-items/table'

import { orderColumns } from './columns'
import type { Order } from '@/api/orders/schema'
import { DataTable } from '@/components/common/data-table'
import { COLUMN_KEYS, type ColumnKey } from '@/components/common/data-table/constants'
import { getColumnVisibilityState, isColumnReadonly } from '@/config/permissions/tables'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth'

const allColumnKeys = Object.values(COLUMN_KEYS)

export const OrdersTable = ({
  data,
  className,
  isLoading,
  columnVisibility,
  subTableColumnVisibility,
  readonlyColumns = []
}: DataTableProps<Order> & { subTableColumnVisibility?: Partial<Record<ColumnKey, boolean>> }) => {
  const { user } = useAuth()

  const { sorting, onSortingChange } = useTableSorting()

  const initialColumnVisibility = useMemo(
    () => (user ? getColumnVisibilityState(user.role, allColumnKeys) : {}),
    [user]
  )

  const table = useReactTable({
    data,
    columns: orderColumns,
    state: {
      sorting,
      columnVisibility: {
        ...initialColumnVisibility,
        ...columnVisibility
      }
    },
    manualSorting: true,
    meta: {
      isColumnReadonly: (columnKey: ColumnKey) =>
        user ? isColumnReadonly(user.role, columnKey) || readonlyColumns.includes(columnKey) : false
    },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original?.origin_items?.length > 0,
    getRowId: (row) => row.id
  })

  // const visibuleFeatures = getVisibleFeatures(user?.role ?? 'worker')

  return (
    <>
      <DataTable
        table={table}
        className={cn(className)}
        isLoading={isLoading}
        renderSubComponent={(row) => {
          return (
            <OriginItemsTable
              data={row.original.origin_items ?? []}
              columnVisibility={subTableColumnVisibility}
            />
          )
        }}
      />
      {/* {visibuleFeatures.has('datePopup') ? (
        <OrdersTablePopup
          table={table}
          key={table
            .getSelectedRowModel()
            .rows.map((row) => row.id)
            .join(',')}
        />
      ) : null} */}
    </>
  )
}
