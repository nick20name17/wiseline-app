import type { ColumnDef } from '@tanstack/react-table'

import { WarehousesActionsMenu } from '../actions'

import type { Warehouse } from '@/api/warehouses/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'

export const warehousesColumns: ColumnDef<Warehouse>[] = [
  {
    accessorKey: COLUMN_KEYS.name,
    header: ({ column }) => (
      <ColumnHeader
        title='Name'
        column={column}
      />
    ),
    size: 250
  },
  {
    accessorKey: COLUMN_KEYS.code,
    header: ({ column }) => (
      <ColumnHeader
        title='Code'
        column={column}
      />
    ),
    size: 250
  },
  {
    accessorKey: COLUMN_KEYS.position,
    header: ({ column }) => (
      <ColumnHeader
        title='Position'
        column={column}
      />
    ),
    size: 250
  },
  {
    accessorKey: COLUMN_KEYS.address,
    header: ({ column }) => (
      <ColumnHeader
        title='Address'
        column={column}
      />
    ),
    cell: ({ row }) => row.original.address || '—',
    size: 250
  },
  {
    accessorKey: COLUMN_KEYS.description,
    header: ({ column }) => (
      <ColumnHeader
        title='Description'
        column={column}
      />
    ),
    cell: ({ row }) => row.original.description || '—',
    size: 250
  },
  {
    accessorKey: COLUMN_KEYS.actions,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Actions'
      />
    ),
    cell: ({ row }) => {
      return (
        <div className='flex items-center justify-center'>
          <WarehousesActionsMenu warehouse={row.original} />
        </div>
      )
    },
    size: 60,
    enableSorting: false
  }
]
