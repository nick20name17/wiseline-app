import type { ColumnDef } from '@tanstack/react-table'

import { UsersActionsMenu } from '../actions'
import { UserRoleBadge } from '../badges/user-role'

import type { User } from '@/api/users/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'

export const usersTableColumns: ColumnDef<User>[] = [
  {
    accessorKey: COLUMN_KEYS.first_name,
    header: ({ column }) => (
      <ColumnHeader
        title='First Name'
        column={column}
      />
    ),
    size: 300
  },
  {
    accessorKey: COLUMN_KEYS.last_name,
    header: ({ column }) => (
      <ColumnHeader
        title='Last Name'
        column={column}
      />
    ),
    size: 300
  },
  {
    accessorKey: COLUMN_KEYS.email,
    header: ({ column }) => (
      <ColumnHeader
        title='Email'
        column={column}
      />
    ),
    size: 400
  },
  {
    accessorKey: COLUMN_KEYS.role,
    header: ({ column }) => (
      <ColumnHeader
        title='Role'
        column={column}
      />
    ),
    cell: ({ row }) => (
      <UserRoleBadge
        className='w-full'
        userRole={row.original.role}
      />
    ),
    size: 120
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
          <UsersActionsMenu user={row.original} />
        </div>
      )
    },
    size: 60,
    enableSorting: false
  }
]
