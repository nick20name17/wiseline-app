import { RiRestartFill } from '@remixicon/react'
import type { AccessorColumnDef, ColumnDef } from '@tanstack/react-table'

import { OriginItemStatusBadge } from '../../badges/origin-item-status'
import { ColumnHeader } from '../../data-table/column-header'
import { COLUMN_KEYS } from '../../data-table/constants'
import { NoteDialog } from '../dialog/note'
import { PullFromStockInput } from '../inputs/pull-form-stock'
import { RemanufactureProdInput } from '../inputs/remanufacture-prod'
import { RemanufactureStockInput } from '../inputs/remanufacture-stock'
import { WrappedFromInput, getLeftToWrapQty } from '../inputs/wrapped-from'
import { OriginItemFlowSelect } from '../selects/origin-item-flow'
import { OriginItemProductionDateSelect } from '../selects/production-date'

import type { OriginItem } from '@/api/origin-items/schema'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { WrappingActionsMenu } from '@/routes/_production/-components/menu/wrapping-actions'
import { StatusCompleteToggle } from '@/routes/_production/-components/toggle/status-complete'
import { createCheckboxColumn } from '@/routes/_shipping/dispatch/-components/tables/packages/columns'
import { formatLength, formatWeight } from '@/utils/format'

const productIdColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.productId,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Product ID'
    />
  ),
  cell: ({ row }) => {
    const remanufacturingQty =
      row.original.remanufacturing_qty ?? 0 + (row.original.remanufacturing_from_stock_qty ?? 0)
    return (
      <div className='flex items-center gap-1.5'>
        {remanufacturingQty > 0 ? <RiRestartFill className='text-yellow size-4' /> : null}
        <span>{row.original.id_inven || '-'}</span>
      </div>
    )
  },
  size: 140
}

const prodDateColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.prodDate,
  accessorFn: (row) => {
    return row?.item?.production_date ?? '—'
  },
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Prod. Date'
    />
  ),
  cell: ({ row, table }) => {
    const readonly = table.options.meta?.isColumnReadonly?.(COLUMN_KEYS.prodDate) ?? false

    return (
      <OriginItemProductionDateSelect
        className='h-7 w-full text-[13px]'
        key={row.original?.item?.production_date}
        readonly={readonly}
        originItem={row.original}
      />
    )
  },
  sortingFn: 'datetime',
  size: 130
}

const categoryColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.category,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Category'
    />
  ),
  cell: ({ row }) => row.original.category || '—',
  size: 130
}

const machineColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.machine,
  accessorFn: (row) => {
    return row?.item?.flow?.name ?? '—'
  },
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Machine'
    />
  ),
  cell: ({ row, table }) => {
    const readonly = table.options.meta?.isColumnReadonly?.(COLUMN_KEYS.machine) ?? false

    return (
      <OriginItemFlowSelect
        readonly={readonly}
        className='w-full border-none p-0'
        originItem={row.original}
      />
    )
  },
  size: 140
}

const statusColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.status,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Status'
    />
  ),
  cell: ({ row }) => {
    return <OriginItemStatusBadge status={row.original?.item?.status ?? null} />
  },
  sortingFn: (a, b) => {
    const getStatus = (row: typeof a | typeof b) => {
      return row.original?.item?.status ?? '—'
    }

    return getStatus(a).localeCompare(getStatus(b))
  },
  size: 140
}

const qtyOrderedColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.quantity,
  accessorFn: (row) => row.quantity ?? '—',
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Qty. Ordered'
    />
  ),
  cell: ({ row }) => row.original.quantity || '—',
  size: 105
}

const stockColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.stock,
  accessorFn: (row) => row.on_hand ?? 0,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Stock'
    />
  ),
  cell: ({ row }) => row.original.on_hand ?? 0,
  size: 75
}

const pfsColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.pfs,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='PFS'
    />
  ),
  cell: ({ row, table }) => {
    const readonly = table.options.meta?.isColumnReadonly?.(COLUMN_KEYS.pfs) ?? false
    return (
      <PullFromStockInput
        className='h-7'
        originItem={row.original}
        readonly={readonly}
      />
    )
  },
  size: 100
}

const weightColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.weight,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Weight'
    />
  ),
  cell: ({ row }) => formatWeight(row.original.weight),
  size: 85
}

const lengthColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.length,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Length'
    />
  ),
  cell: ({ row }) => (row.original.length ? formatLength(row.original.length) : '—'),
  size: 130
}

const descriptionColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.description,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Description'
    />
  ),
  cell: ({ row }) =>
    row.original.description ? (
      <Tooltip>
        <TooltipTrigger
          className='w-full truncate text-left'
          asChild
        >
          <div>{row.original.description}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{row.original.description}</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      '—'
    ),
  size: 280
}

const leftToWrapColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.leftToWrap,
  accessorFn: (row) => getLeftToWrapQty(row) ?? '-',
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Left to Wrap'
    />
  ),
  cell: ({ row }) => {
    const leftToWrap = getLeftToWrapQty(row.original)

    return leftToWrap ?? '—'
  },
  size: 120
}

const wrappedFromColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.wrappedFrom,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Wrap Stock / Wrap Prod.'
    />
  ),
  cell: ({ row }) => (
    <WrappedFromInput
      originItem={row.original}
      className='h-7'
    />
  ),
  sortingFn: (rowA, rowB) => {
    const getWrappedTotal = (row: typeof rowA | typeof rowB) => {
      const item = row.original.item
      return (item?.wrapped_from_stock || 0) + (item?.wrapped_from_production || 0)
    }
    return getWrappedTotal(rowA) - getWrappedTotal(rowB)
  },
  enableSorting: false,
  size: 200
}

const remanufacturedFromStockColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.remanufacturingFromStock,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='RM-S'
    />
  ),
  cell: ({ row }) => (
    <RemanufactureStockInput
      originItem={row.original}
      className='h-7'
    />
  ),
  size: 80
}

export const remanufacturedFromProductColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.remanufactoringFromProd,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='RM-P'
    />
  ),
  cell: ({ row, table }) => {
    const readonly =
      table.options.meta?.isColumnReadonly?.(COLUMN_KEYS.remanufactoringFromProd) ?? false

    return (
      <RemanufactureProdInput
        readonly={readonly}
        originItem={row.original}
        className='h-7'
      />
    )
  },
  size: 80
}

const actionsColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.originItemsActions,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Actions'
    />
  ),
  cell: ({ row }) => {
    return (
      <div className='flex items-center justify-center'>
        <WrappingActionsMenu
          originItem={row.original}
          without={['create']}
        />
      </div>
    )
  },
  size: 65,
  enableSorting: false
}

export const useStockColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.useStock,
  accessorFn: (row) => row?.item?.pull_from_stock ?? 0,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Use Stock'
    />
  ),
  cell: ({ row }) => row.original?.item?.pull_from_stock ?? 0,
  size: 120
}

const customerColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.customer,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Customer'
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

const orderColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.order,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Order #'
    />
  ),
  size: 90
}

const remanufacturedQtyColumn: AccessorColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.remanufactured,
  accessorFn: (row) => row.remanufacturing_qty + row.remanufacturing_from_stock_qty,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Remanufactured'
    />
  ),
  cell: ({ row }) => {
    const originiItem = row.original
    return originiItem.remanufacturing_qty + originiItem.remanufacturing_from_stock_qty
  }
}

export const notesColumn: ColumnDef<OriginItem> = {
  accessorKey: COLUMN_KEYS.notes,
  header: ({ column }) => (
    <ColumnHeader
      column={column}
      title='Notes'
    />
  ),
  cell: ({ row }) => (
    <NoteDialog
      originItem={row.original}
      className='w-full'
    />
  ),
  size: 130,
  enableSorting: false
}

export const originItemsColumns: ColumnDef<OriginItem>[] = [
  createCheckboxColumn({
    accessorKey: COLUMN_KEYS.checkbox,
    isRowSelectable: (row) =>
      row.original?.item?.status !== 'wrapped' && row.original?.item?.status !== 'shipped'
  }),
  productIdColumn,
  prodDateColumn,
  customerColumn,
  orderColumn,
  categoryColumn,
  machineColumn,
  statusColumn,
  {
    accessorKey: COLUMN_KEYS.statusComplete,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Complete'
      />
    ),
    enableSorting: false,
    cell: ({ row }) => <StatusCompleteToggle originItems={[row.original]} />,
    size: 160
  },
  remanufacturedQtyColumn,
  qtyOrderedColumn,
  stockColumn,
  pfsColumn,
  useStockColumn,
  leftToWrapColumn,
  wrappedFromColumn,
  remanufacturedFromStockColumn,
  remanufacturedFromProductColumn,
  weightColumn,
  lengthColumn,
  descriptionColumn,
  notesColumn,
  actionsColumn
]
