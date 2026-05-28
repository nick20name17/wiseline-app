import { RiCheckboxCircleFill, RiQrCodeLine } from '@remixicon/react'
import type { AccessorColumnDef, Row } from '@tanstack/react-table'
import { type Table } from '@tanstack/react-table'

import type { Package } from '@/api/packages/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { createExpanderColumn } from '@/components/common/data-table/columns'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { PrintStickerDialog } from '@/routes/_production/-components/sticker/components/dialog'
import { packageSticker } from '@/routes/_production/-components/sticker/components/stickers/package-sticker'
import { ViewSkidDialog } from '@/routes/_shipping/-components/dialogs/view-skid'
import { formatLength, formatWeight, ordinal } from '@/utils/format'

const isRowSelectable = (row: Row<Package>) =>
  !row.original.load?.ready_to_load && !row.original.load?.truck_id

type SelectableFn<T> = (row: Row<T>) => boolean

interface CheckboxColumnOptions<T> {
  accessorKey: string
  isRowSelectable: SelectableFn<T>
  size?: number
}

export const createCheckboxColumn = <T,>({
  accessorKey,
  isRowSelectable,
  size = 40
}: CheckboxColumnOptions<T>) => {
  return {
    accessorKey,

    header: ({ table }: { table: Table<T> }) => {
      const rows = table.getRowModel().rows
      const selectableRows = rows.filter(isRowSelectable)

      const allSelected =
        selectableRows.length > 0 && selectableRows.every((row) => row.getIsSelected())

      const someSelected = selectableRows.some((row) => row.getIsSelected()) && !allSelected

      return (
        <div className='flex items-center justify-center'>
          <Checkbox
            disabled={selectableRows.length === 0}
            checked={allSelected || (someSelected && 'indeterminate')}
            onCheckedChange={(value) => {
              selectableRows.forEach((row) => {
                row.toggleSelected(!!value)
              })
            }}
            aria-label='Select all'
          />
        </div>
      )
    },

    cell: ({ row }: { row: Row<T> }) => {
      const disabled = !isRowSelectable(row)

      return (
        <div
          className='flex items-center justify-center'
          id='checkbox'
        >
          <Checkbox
            disabled={disabled}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              if (!disabled) {
                row.toggleSelected(!!value)
              }
            }}
            aria-label='Select row'
          />
        </div>
      )
    },

    size,
    enableResizing: false,
    enableSorting: false,
    enableHiding: false
  }
}

export const packagesColumns: AccessorColumnDef<Package>[] = [
  createCheckboxColumn({
    accessorKey: COLUMN_KEYS.checkbox,
    isRowSelectable
  }),
  createCheckboxColumn({
    accessorKey: COLUMN_KEYS.loadCheckbox,
    isRowSelectable: (row: Row<Package>) =>
      !row.original.load?.ready_to_load && !row.original.load?.road_confirmed
  }),
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
      return (
        <div className='flex items-center justify-between gap-2.5'>
          <span>PCKG {row.original.id}</span>
          <PrintStickerDialog
            definition={packageSticker}
            entity={row.original}
            order={{
              customer: row.original?.package_items?.[0]?.origin_item?.customer,
              invoice: row.original?.package_items?.[0]?.origin_item.order
            }}
          >
            <Button
              className='h-7'
              variant='outline'
              size='sm'
            >
              <RiQrCodeLine />
              <span>Print Sticker</span>
            </Button>
          </PrintStickerDialog>
        </div>
      )
    },
    size: 200
  },
  {
    accessorKey: COLUMN_KEYS.viewSkid,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Skid relation'
      />
    ),
    cell: ({ row }) => {
      return (
        <ViewSkidDialog
          className='w-full'
          skidId={row.original.skid_id}
        />
      )
    },
    enableSorting: false,
    size: 100
  },
  {
    accessorKey: COLUMN_KEYS.weight,
    accessorFn: (row) => {
      const packageItemsTotalWeight = row?.package_items?.reduce((prev, packItem) => {
        return prev + packItem?.origin_item.weight * packItem.quantity
      }, 0)
      return packageItemsTotalWeight ?? '—'
    },
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Weight'
      />
    ),
    cell: ({ row }) => {
      const packageItemsTotalWeight = row.original?.package_items?.reduce((prev, packItem) => {
        return prev + packItem?.origin_item.weight * packItem.quantity
      }, 0)
      return packageItemsTotalWeight ? formatWeight(packageItemsTotalWeight) : '—'
    },
    size: 120
  },
  {
    accessorKey: COLUMN_KEYS.length,
    accessorFn: (row) => {
      const maxLength = row?.package_items?.reduce(
        (acc, item) => Math.max(acc, item?.origin_item?.length),
        0
      )
      return maxLength ?? '—'
    },
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Longest Length'
      />
    ),
    cell: ({ row }) => {
      const maxLength = row.original?.package_items?.reduce(
        (acc, item) => Math.max(acc, item?.origin_item?.length),
        0
      )
      return maxLength ? formatLength(maxLength) : '—'
    },
    size: 120
  },
  {
    accessorKey: COLUMN_KEYS.truck,
    accessorFn: (row) => row.load?.truck.name ?? '—',
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Truck'
      />
    ),
    cell: ({ row }) => (row.original.load ? row.original.load.truck.name : '—'),
    size: 120
  },
  {
    accessorKey: COLUMN_KEYS.load,
    accessorFn: (row) => row.load?.position ?? -1,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Load'
      />
    ),
    cell: ({ row }) => {
      const { ready_to_load } = row.original.load ?? {}
      return (
        <div className='flex items-center gap-2'>
          {ready_to_load ? <RiCheckboxCircleFill className='text-primary size-4' /> : null}
          {row.original?.load?.position ? (
            <span>{ordinal(row.original?.load?.position)}</span>
          ) : (
            '—'
          )}
        </div>
      )
    },
    size: 120
  }
]
