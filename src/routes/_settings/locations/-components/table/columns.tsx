import type { ColumnDef } from '@tanstack/react-table'

import { LocationsActionsMenu } from '../actions'

import type { Location } from '@/api/locations/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'
import { formatWeight } from '@/utils/format'

export const locationsColumns: ColumnDef<Location>[] = [
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
    accessorKey: COLUMN_KEYS.weight,
    header: ({ column }) => (
      <ColumnHeader
        title='Max Weight'
        column={column}
      />
    ),
    cell: ({ row }) => formatWeight(row.original.weight),
    size: 250
  },
  {
    accessorKey: COLUMN_KEYS.warehouse,
    header: ({ column }) => (
      <ColumnHeader
        title='Warehouse'
        column={column}
      />
    ),
    cell: ({ row }) => row.original.warehouse.name,
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
          <LocationsActionsMenu location={row.original} />
        </div>
      )
    },
    size: 60,
    enableSorting: false
  }
]
