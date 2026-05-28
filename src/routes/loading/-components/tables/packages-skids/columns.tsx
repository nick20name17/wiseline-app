import { RiCheckboxCircleFill, RiQrCodeLine } from '@remixicon/react'
import type { AccessorColumnDef, Row } from '@tanstack/react-table'

import { IsLoadedBadge } from '../../badges/is-loaded'

import type { Package } from '@/api/packages/schema'
import type { Skids } from '@/api/skids/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header'
import { createExpanderColumn } from '@/components/common/data-table/columns'
import { COLUMN_KEYS } from '@/components/common/data-table/constants'
import { Button } from '@/components/ui/button'
import { PrintStickerDialog } from '@/routes/_production/-components/sticker/components/dialog'
import { packageSticker } from '@/routes/_production/-components/sticker/components/stickers/package-sticker'
import { skidSticker } from '@/routes/_production/-components/sticker/components/stickers/skid-sticker'
import { createCheckboxColumn } from '@/routes/_shipping/dispatch/-components/tables/packages/columns'
import { formatLength, formatWeight, ordinal } from '@/utils/format'

const isRowSelectable = (row: Row<Package | Skids>) =>
  'package_items' in row.original && !row.original?.is_loaded

const getSkidCustomerAndInvoice = (skid: Skids) => {
  const customers = new Set<string>()
  const invoices = new Set<string>()

  skid.packages.forEach((p) => {
    const origin = p.package_items?.[0]?.origin_item
    if (!origin) return

    if (origin.customer) customers.add(origin.customer)
    if (origin.order) invoices.add(origin.order)
  })

  return {
    customer: [...customers].join(', '),
    invoice: [...invoices].join(', ')
  }
}

export const packagesSkidsColumns: AccessorColumnDef<Package | Skids>[] = [
  createCheckboxColumn({
    accessorKey: COLUMN_KEYS.checkbox,
    isRowSelectable
  }),
  createExpanderColumn(),
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Packages'
      />
    ),
    cell: ({ row }) => {
      const isPackage = 'package_items' in row.original
      const customer =
        'package_items' in row.original
          ? row.original.package_items[0].origin_item.customer
          : getSkidCustomerAndInvoice(row.original).customer

      const invoice =
        'package_items' in row.original
          ? row.original.package_items[0].origin_item.order
          : getSkidCustomerAndInvoice(row.original).invoice

      return (
        <div className='flex items-center justify-between gap-2.5'>
          <span>
            {isPackage ? 'PCKG' : 'SKD'} {row.original.id}
          </span>
          <PrintStickerDialog
            definition={isPackage ? packageSticker : skidSticker}
            entity={row.original}
            order={{
              customer,
              invoice
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
    size: 270
  },
  {
    accessorKey: COLUMN_KEYS.weight,
    accessorFn: (row) => row.weight ?? '—',
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Weight'
      />
    ),
    cell: ({ row }) => (row.original.weight ? formatWeight(row.original.weight) : '—'),
    size: 270
  },
  {
    accessorKey: COLUMN_KEYS.length,
    accessorFn: (row) => row.length ?? '—',
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Longest Length'
      />
    ),
    cell: ({ row }) => (row.original.length ? formatLength(row.original.length) : '—'),
    size: 270
  },
  {
    accessorKey: COLUMN_KEYS.truck,
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
    }
  },
  {
    accessorKey: COLUMN_KEYS.status,
    accessorFn: (row) => (row.is_loaded ? 'Loaded' : 'Unloaded'),
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Status'
      />
    ),
    cell: ({ row }) => <IsLoadedBadge skidOrPackage={row.original} />,
    size: 280
  }
]
