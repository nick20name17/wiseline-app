import type { AccessorKeyColumnDef } from '@tanstack/react-table'

import type { FlowsTableGroup } from './table'
import { PriorityBadge } from '@/components/common/badges/priority'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { createExpanderColumn } from '@/components/common/data-table/columns'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'

export const groupedDateColorGaugeTableColumns: AccessorKeyColumnDef<FlowsTableGroup>[] = [
  // createCheckboxColumn(),
  createExpanderColumn(),
  // {
  //   accessorKey: COLUMN_KEYS.prodDate,
  //   header: ({ column }) => (
  //     <ColumnHeader
  //       column={column}
  //       title='Prod. Date'
  //     />
  //   ),
  //   cell: ({ row }) =>
  //     row.original.key?.productionDate
  //       ? format(row.original.key.productionDate, DATE_FORMAT.weekdayShort)
  //       : '—'
  // },
  {
    accessorKey: COLUMN_KEYS.color + '/' + COLUMN_KEYS.gauge,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Color/Gauge'
      />
    ),
    cell: ({ row }) => row.original.key?.color + ' / ' + (row.original.key?.gauge ?? '—'),
    sortingFn: (rowA, rowB) => {
      const getColorGauge = (row: typeof rowA | typeof rowB) => {
        return row.original.key?.color + ' / ' + (row.original.key?.gauge ?? '—')
      }
      return getColorGauge(rowA).localeCompare(getColorGauge(rowB))
    },
    size: 300
  },
  {
    accessorKey: COLUMN_KEYS.priority,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Priority'
      />
    ),
    cell: ({ row }) => <PriorityBadge priority={row.original.key?.priority} />,
    size: 300
  }
]
