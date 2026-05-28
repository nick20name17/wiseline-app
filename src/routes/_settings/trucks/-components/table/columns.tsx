import type { ColumnDef } from '@tanstack/react-table'

import { TrucksActionsMenu } from '../actions'

import type { Truck } from '@/api/trucks/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'
import { formatLength, formatWeight } from '@/utils/format'

export const trucksColumns: ColumnDef<Truck>[] = [
  {
    accessorKey: COLUMN_KEYS.name,
    header: ({ column }) => (
      <ColumnHeader
        title='Name'
        column={column}
      />
    ),
    size: 200
  },
  {
    accessorKey: COLUMN_KEYS.maxHeight,
    header: ({ column }) => (
      <ColumnHeader
        title='Max Height'
        column={column}
      />
    ),
    cell: ({ row }) => formatLength(row.original.max_height),
    size: 200
  },
  {
    accessorKey: COLUMN_KEYS.maxLength,
    header: ({ column }) => (
      <ColumnHeader
        title='Max Length'
        column={column}
      />
    ),
    cell: ({ row }) => formatLength(row.original.max_length),
    size: 200
  },
  {
    accessorKey: COLUMN_KEYS.maxWeight,
    header: ({ column }) => (
      <ColumnHeader
        title='Max Weight'
        column={column}
      />
    ),
    cell: ({ row }) => formatWeight(row.original.max_weight),
    size: 200
  },
  {
    accessorKey: COLUMN_KEYS.maxVolume,
    header: ({ column }) => (
      <ColumnHeader
        title='Max Volume'
        column={column}
      />
    ),
    size: 200
  },
  {
    accessorKey: COLUMN_KEYS.maxWidth,
    header: ({ column }) => (
      <ColumnHeader
        title='Max Width'
        column={column}
      />
    ),
    cell: ({ row }) => formatLength(row.original.max_width),
    size: 200
  },
  {
    accessorKey: COLUMN_KEYS.actions,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Actions'
      />
    ),
    cell: ({ row }) => (
      <div className='flex items-center justify-center'>
        <TrucksActionsMenu truck={row.original} />
      </div>
    ),
    size: 60,
    enableSorting: false
  }
]
