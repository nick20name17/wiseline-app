import { RiCalendar2Line } from '@remixicon/react'
import type { AccessorKeyColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'

import { MapDialog } from '../../dialogs/map'
import { OrderStatusBadge } from '../badges/order-status'
import { ShipViaBadge } from '../badges/ship-via'
import { OrderPrioritySelect } from '../selects/order-priority'
import { ReviewToggle } from '../toggle/review-toggle'
import { RtpToggle } from '../toggle/rtp-toggle'

import type { Order } from '@/api/orders/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { createExpanderColumn } from '@/components/common/data-table/columns'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DATE_FORMAT } from '@/constants/date'
import { formatDateRange, formatLength, formatWeight } from '@/utils/format'

const entryDateColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.entryDate,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Entry Date'
    />
  ),
  cell: ({ row }) =>
    row.original.e_date ? format(row.original.e_date, DATE_FORMAT.weekdayShort) : '—',
  size: 140
}

const shipDateColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.shipDate,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Ship Date'
    />
  ),
  cell: ({ row }) =>
    row.original.ship_date ? format(row.original.ship_date, DATE_FORMAT.weekdayShort) : '—',
  size: 140
}

const statusColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.status,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Status'
    />
  ),
  cell: ({ row }) => <OrderStatusBadge status={row.original?.sales_order?.status} />,
  size: 140
}

const productionDateColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.prodDate,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Prod. Date'
    />
  ),
  cell: ({ row }) => {
    const { min_production_date, max_production_date } = row.original

    if (!min_production_date || !max_production_date) return '—'

    return formatDateRange(min_production_date, max_production_date)
  },

  size: 210
}

const completedDateColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.completed,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Completed'
    />
  ),
  cell: ({ row }) => {
    const date = row.original.sales_order.latest_audit_logs.find(
      (log) => log.new_data === 'wrapped'
    )?.created_at

    return date ? (
      <Button
        size='sm'
        variant='outline'
        className='text-muted-foreground pointer-events-none w-full justify-start bg-transparent'
      >
        <RiCalendar2Line />
        <span>{format(date, DATE_FORMAT.dotsDatetime)}</span>
      </Button>
    ) : (
      '—'
    )
  },
  size: 185
}

const orderPriorityColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.priority,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Priority'
    />
  ),
  cell: ({ row, table }) => {
    const readonly = table.options.meta?.isColumnReadonly?.(COLUMN_KEYS.priority) ?? false

    return (
      <OrderPrioritySelect
        order={row.original}
        readonly={readonly}
        className='w-full border-none px-0'
      />
    )
  },
  size: 115
}

const createReviewColumn = (): AccessorKeyColumnDef<Order> => {
  return {
    accessorKey: COLUMN_KEYS.review,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Review'
      />
    ),
    cell: ({ row, table }) => {
      const readonly = table.options.meta?.isColumnReadonly?.(COLUMN_KEYS.review) ?? false

      return (
        <ReviewToggle
          readonly={
            row.original.sales_order?.status === 'wrapped' ||
            row.original.sales_order?.status === 'delivered' ||
            readonly
          }
          className='w-full'
          order={row.original}
        />
      )
    },
    size: 110
  }
}

const createRtpColumn = (): AccessorKeyColumnDef<Order> => ({
  accessorKey: COLUMN_KEYS.rtp,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='RTP'
    />
  ),
  cell: ({ row, table }) => {
    const readonly = table.options.meta?.isColumnReadonly?.(COLUMN_KEYS.rtp) ?? false

    return (
      <RtpToggle
        readonly={
          row.original.sales_order?.status === 'wrapped' ||
          row.original.sales_order?.status === 'delivered' ||
          readonly
        }
        className='w-full'
        order={row.original}
      />
    )
  },
  size: 120
})

const shipTypeColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.shipType,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Ship. Type'
    />
  ),
  cell: ({ row }) => <ShipViaBadge shipVia={row.original.ship_via} />,
  size: 110
}

const orderColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.invoice,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Order #'
    />
  ),
  size: 102
}

const customerColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.customer,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Customer Name'
    />
  ),
  cell: ({ row }) =>
    row.original.customer ? (
      <Tooltip>
        <TooltipTrigger
          className='w-full truncate text-left'
          asChild
        >
          <div> {row.original.customer}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{row.original.customer}</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      '—'
    ),
  size: 230
}

const addressColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.address,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Address'
    />
  ),
  cell: ({ row }) =>
    row.original.c_address1 ? (
      <Tooltip>
        <TooltipTrigger
          className='w-full truncate text-left'
          asChild
        >
          <div> {row.original.c_address1}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{row.original.c_address1}</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      '—'
    ),
  size: 180
}

const mapColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.map,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Map'
    />
  ),
  cell: ({ row }) => (
    <MapDialog
      className='w-full'
      order={row.original}
    />
  ),
  size: 88,
  enableSorting: false
}

const weightColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.totalWeight,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Job Weight'
    />
  ),
  cell: ({ row }) => (row.original.total_weight ? formatWeight(row.original.total_weight) : '—'),
  size: 120
}

const lengthColumn: AccessorKeyColumnDef<Order> = {
  accessorKey: COLUMN_KEYS.maxLength,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Longest Length'
    />
  ),
  cell: ({ row }) => (row.original.max_length ? formatLength(row.original.max_length) : '—'),
  size: 140
}

export const orderColumns: AccessorKeyColumnDef<Order>[] = [
  // createCheckboxColumn(),
  createExpanderColumn(),
  entryDateColumn,
  shipDateColumn,
  productionDateColumn,
  statusColumn,
  completedDateColumn,
  orderPriorityColumn,
  createReviewColumn(),
  createRtpColumn(),
  shipTypeColumn,
  orderColumn,
  customerColumn,
  addressColumn,
  mapColumn,
  weightColumn,
  lengthColumn
]
