import { useQuery } from '@tanstack/react-query'
import { getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import { useState } from 'react'

import { PackageItemsTable } from '../package-items'
import { PackagesTable } from '../packages'

import type { Order } from '@/api/orders/schema'
import { getPackagesItemsQueryOptions } from '@/api/packages-items/query'
import { getPackagesQueryOptions } from '@/api/packages/query'
import { DataTable } from '@/components/common/data-table'
import { type ColumnKey } from '@/components/common/data-table/constants'
import { useTableSorting } from '@/components/common/data-table/hooks'
import type { DataTableProps } from '@/components/common/data-table/types'
import { orderColumns } from '@/components/common/orders/table/columns'
import { isColumnReadonly } from '@/config/permissions/tables'
import { useAuth } from '@/providers/auth'
import {
  DispatchFilter,
  type DispatchFilterParam
} from '@/routes/_shipping/-components/filters/dispatch'

export const DispatchOrdersTable = ({
  data,
  className,
  isLoading,
  columnVisibility,
  readonlyColumns = ['release_to_production', 'review']
}: DataTableProps<Order>) => {
  const { user } = useAuth()
  const [dispatch, setDispatch] = useState<DispatchFilterParam>('items')

  const initialColumnVisibility: Partial<Record<ColumnKey, boolean>> = {}

  const { sorting, onSortingChange } = useTableSorting()

  const table = useReactTable({
    data,
    columns: orderColumns,
    manualSorting: true,
    state: {
      sorting,
      columnVisibility: {
        ...initialColumnVisibility,
        ...columnVisibility
      }
    },
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

  return (
    <DataTable
      table={table}
      className={className}
      isLoading={isLoading}
      renderSubComponent={(row) => {
        return (
          <div className='mt-2 space-y-2'>
            <DispatchFilter
              dispatch={dispatch}
              setDispatch={setDispatch}
            />

            {dispatch === 'items' ? (
              <ItemsSubTable
                order={row.original}
                dispatch={dispatch}
              />
            ) : null}

            {dispatch === 'packages' ? (
              <PackagesSubTable
                order={row.original}
                dispatch={dispatch}
              />
            ) : null}
          </div>
        )
      }}
    />
  )
}

interface SubTableProps {
  order: Order
  dispatch: DispatchFilterParam
}

const ItemsSubTable = ({ dispatch, order }: SubTableProps) => {
  const { data: packageItems, isLoading } = useQuery({
    ...getPackagesItemsQueryOptions({
      order: order.id
    }),
    enabled: dispatch === 'items'
  })

  return (
    <PackageItemsTable
      className='[&_thead]:z-9'
      data={packageItems?.results ?? []}
      isLoading={isLoading}
    />
  )
}

const PackagesSubTable = ({ order, dispatch }: SubTableProps) => {
  const { data: packages, isLoading } = useQuery({
    ...getPackagesQueryOptions({
      order: order.id
    }),
    enabled: dispatch === 'packages'
  })

  return (
    <PackagesTable
      className='[&_thead]:z-9'
      data={packages?.results ?? []}
      isLoading={isLoading}
    />
  )
}
