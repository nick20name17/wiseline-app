import type { AccessorKeyColumnDef } from '@tanstack/react-table'

import { IsLoadedBadge } from '../../../badges/is-loaded'

import type { Package } from '@/api/packages/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { createExpanderColumn } from '@/components/common/data-table/columns'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'
import { formatLength, formatWeight } from '@/utils/format'

export const weightColumn: AccessorKeyColumnDef<Package> = {
  accessorKey: COLUMN_KEYS.weight,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Weight'
    />
  ),
  cell: ({ row }) => {
    const packageItemsTotalWeight = row.original?.weight
    return packageItemsTotalWeight ? formatWeight(packageItemsTotalWeight) : '-'
  },
  size: 170
}

export const lengthColumn: AccessorKeyColumnDef<Package> = {
  accessorKey: COLUMN_KEYS.length,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Longest Length'
    />
  ),
  cell: ({ row }) => {
    const maxLength = row.original.length
    return maxLength ? formatLength(maxLength) : '-'
  },
  size: 170
}

export const packagesColumns: AccessorKeyColumnDef<Package>[] = [
  createExpanderColumn(),
  {
    accessorKey: COLUMN_KEYS.packages,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Packages'
      />
    ),
    cell: ({ row }) => {
      return <div>PCKG {row.original.id}</div>
    },
    size: 270
  },
  weightColumn,
  lengthColumn,
  {
    accessorKey: COLUMN_KEYS.status,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Status'
      />
    ),
    cell: ({ row }) => <IsLoadedBadge skidOrPackage={row.original} />,
    size: 170
  }
]
