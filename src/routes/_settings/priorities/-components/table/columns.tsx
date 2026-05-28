import type { ColumnDef } from '@tanstack/react-table'

import { PrioritiesActionsMenu } from '../actions'

import type { Priority } from '@/api/priorities/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'

export const prioritiesColumns: ColumnDef<Priority>[] = [
  {
    accessorKey: COLUMN_KEYS.color,
    header: ({ column }) => (
      <ColumnHeader
        title='Color'
        column={column}
      />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <div
          className='size-5 rounded-sm'
          style={{ backgroundColor: row.original.color }}
        ></div>
        <div>{row.original.color}</div>
      </div>
    ),
    size: 200
  },

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
    accessorKey: COLUMN_KEYS.actions,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Actions'
      />
    ),
    cell: ({ row }) => {
      return (
        <div className='flex items-center'>
          <PrioritiesActionsMenu priority={row.original} />
        </div>
      )
    },
    size: 500,
    enableSorting: false
  }
]
