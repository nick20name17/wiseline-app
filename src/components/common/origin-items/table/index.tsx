import {
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { useMemo } from 'react'

import type { DataTableProps } from '../../data-table/types'
import { OriginItemProdDatePopup } from '../popups/prod-date'

import { originItemsColumns } from './columns'
import type { OriginItem } from '@/api/origin-items/schema'
import { DataTable } from '@/components/common/data-table'
import { COLUMN_KEYS, type ColumnKey } from '@/components/common/data-table/constants'
import { getColumnVisibilityState, isColumnReadonly } from '@/config/permissions/tables'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth'

const allColumnKeys = Object.values(COLUMN_KEYS)

export const OriginItemsTable = ({
  data,
  className,
  isLoading,
  columnVisibility,
  onRowClick,
  readonlyColumns = []
}: DataTableProps<OriginItem>) => {
  const { user } = useAuth()

  const initialColumnVisibility = useMemo(
    () => (user ? getColumnVisibilityState(user.role, allColumnKeys) : {}),
    [user]
  )

  const table = useReactTable({
    data,
    columns: originItemsColumns,
    state: {
      columnVisibility: {
        ...initialColumnVisibility,
        checkbox: false,
        remanufactured: false,
        comments: false,
        status_complete: false,
        ...columnVisibility
      }
    },
    meta: {
      isColumnReadonly: (columnKey: ColumnKey) =>
        user ? isColumnReadonly(user.role, columnKey) || readonlyColumns.includes(columnKey) : false
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // @ts-expect-error fix later
    getRowId: (row) => row.key ?? row.id
  })

  return (
    <>
      <DataTable
        table={table}
        className={cn('[&_thead]:z-9', className)}
        isLoading={isLoading}
        onRowClick={onRowClick}
      />
      <OriginItemProdDatePopup
        table={table}
        key={table
          .getSelectedRowModel()
          .rows.map((row) => row.id)
          .join(',')}
      />
    </>
  )
}
