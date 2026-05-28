import type { AccessorKeyColumnDef } from '@tanstack/react-table'

import type { GroupedByDateGaugeColor } from './table'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { createExpanderColumn } from '@/components/common/data-table/columns'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'

export const cuttingGroupedTableColumns: AccessorKeyColumnDef<GroupedByDateGaugeColor>[] = [
  createExpanderColumn(),
  // {
  //   accessorKey: COLUMN_KEYS.date,
  //   header: ({ column }) => (
  //     <ColumnHeader
  //       column={column}
  //       title='Date'
  //     />
  //   ),
  //   sortingFn: (a, b) => {
  //     const t1 = a.original.prod_date ? Date.parse(a.original.prod_date) : Infinity
  //     const t2 = b.original.prod_date ? Date.parse(b.original.prod_date) : Infinity
  //     return t1 - t2
  //   },
  //   cell: ({ row }) =>
  //     row.original.prod_date ? format(row.original.prod_date, DATE_FORMAT.weekdayShort) : '-',
  //   size: 480
  // },
  {
    accessorKey: COLUMN_KEYS.gauge,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Gauge'
      />
    ),
    cell: ({ row }) => row.original.gauge ?? '-',
    size: 480
  },
  {
    accessorKey: COLUMN_KEYS.color,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Color'
      />
    ),
    cell: ({ row }) => row.original.color ?? '-',
    size: 480
  }
]
