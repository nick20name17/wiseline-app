import { RiBox2Fill, RiCheckboxCircleFill, RiPrinterLine } from '@remixicon/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { type HtmlHTMLAttributes, type PropsWithChildren, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { TrimLocationMenu } from '../menu/trim-location'
import { PrintStickerDialog } from '../sticker/components/dialog'
import { packageSticker } from '../sticker/components/stickers/package-sticker'

import { ORDERS_QUERY_KEYS, getOrderQueryOptions } from '@/api/orders/query'
import { ORIGIN_ITEMS_QUERY_KEYS } from '@/api/origin-items/query'
import type { OriginItem } from '@/api/origin-items/schema'
import { packagesItemsService } from '@/api/packages-items/service'
import { PACKAGES_QUERY_KEYS } from '@/api/packages/query'
import { OrderStatusBadge } from '@/components/common/orders/badges/order-status'
import { useWrappedFromStore } from '@/components/common/origin-items/inputs/wrapped-from'
import { OriginItemsTable } from '@/components/common/origin-items/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { DATE_FORMAT } from '@/constants/date'
import { cn } from '@/lib/utils'

interface CreatePackageDialogProps extends PropsWithChildren {
  originItem: OriginItem
  open?: boolean
  setOpen?: (open: boolean) => void
}

export const CreatePackageButton = (props: HtmlHTMLAttributes<HTMLButtonElement>) => (
  <Button
    className={cn('bg-background', props.className)}
    variant='ghost'
    size='sm'
    {...props}
  >
    <RiBox2Fill />
    <span>Create Package</span>
  </Button>
)

export const CreatePackageDialog = ({
  originItem,
  children,
  open: externalOpen,
  setOpen: externalSetOpen
}: CreatePackageDialogProps) => {
  const [openStickerDialog, setOpenStickerDialog] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)

  const { wrapped, reset } = useWrappedFromStore()

  const isControlled = externalOpen !== undefined
  const open = isControlled ? externalOpen : internalOpen
  const setOpen = isControlled ? externalSetOpen! : setInternalOpen

  const { data: order, isLoading } = useQuery(getOrderQueryOptions(originItem.origin_order))

  const [locationId, setLocationId] = useState<number | null>(order?.latest_location_id ?? null)

  useEffect(() => {
    setLocationId(order?.latest_location_id ?? null)
  }, [order])

  const originItemsWithWrapped =
    order?.origin_items.filter((originItem) => wrapped[originItem.id]) || []

  const multicreateMutation = useMutation({
    mutationFn: packagesItemsService.multicreate
  })

  const totalWrappedQuantity = originItemsWithWrapped.reduce(
    (sum, originItem) =>
      sum + wrapped[originItem.id].wrappedFromProduction + wrapped[originItem.id].wrappedFromStock,
    0
  )

  const handleCreatePackage = ({ printSticker }: { printSticker?: boolean }) => {
    if (!order || !locationId) return

    const packageItems = originItemsWithWrapped
      .map((originItem) => {
        const { wrappedFromProduction, wrappedFromStock } = wrapped[originItem.id]
        return {
          quantity: wrappedFromProduction + wrappedFromStock,
          order: order.id,
          order_item: originItem.id,
          wrapped_from_production: wrappedFromProduction,
          wrapped_from_stock: wrappedFromStock
        }
      })
      .filter((p) => p.quantity > 0)

    multicreateMutation.mutate(
      { location_id: locationId, package_items: packageItems },
      {
        onSuccess: (_, __, ___, context) => {
          context.client.invalidateQueries({ queryKey: PACKAGES_QUERY_KEYS.lists() })
          context.client.invalidateQueries({ queryKey: ORIGIN_ITEMS_QUERY_KEYS.lists() })
          context.client.invalidateQueries({ queryKey: ORDERS_QUERY_KEYS.detail(order.id) })

          if (printSticker) setOpenStickerDialog(true)

          setLocationId(null)
          reset()
          toast.success('Package created successfully')
        }
      }
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className='flex h-[95vh] flex-col justify-between gap-6 sm:w-full sm:max-w-332.5'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <span>Wrapping: </span>
              {isLoading ? <Skeleton className='h-4.5 w-40' /> : <span>{order?.customer}</span>}/
              {isLoading ? <Skeleton className='h-4.5 w-20' /> : <span>#{order?.invoice}</span>}
            </DialogTitle>
          </DialogHeader>
          <OriginItemsTable
            key={multicreateMutation.isSuccess ? 'success' : 'idle'}
            className='min-w-0 flex-1'
            isLoading={isLoading}
            data={order?.origin_items ?? []}
            columnVisibility={{
              category: false,
              flow: false,
              pfs: false,
              customer: false,
              production_date: false,
              order: false,
              origin_item_actions: false
            }}
          />

          <div className='min-w-0 space-y-3.5 rounded-3xl border p-3.5'>
            <div className='space-y-2 divide-y text-sm'>
              <div className='flex items-center justify-between gap-2 pb-2'>
                <span>PO:</span>
                {isLoading ? (
                  <Skeleton className='h-4 w-30' />
                ) : (
                  <span className='font-semibold'>{order?.invoice}</span>
                )}
              </div>
              <div className='flex items-center justify-between gap-2 pb-2'>
                <span>Salesman:</span>
                {isLoading ? (
                  <Skeleton className='h-4 w-20' />
                ) : (
                  <span className='font-semibold'>{order?.salesman}</span>
                )}
              </div>
              <div className='flex items-center justify-between gap-2 pb-2'>
                <span>Ship Via:</span>
                {isLoading ? (
                  <Skeleton className='h-4 w-25' />
                ) : (
                  <span className='font-semibold'>{order?.ship_via}</span>
                )}
              </div>
              <div className='flex items-center justify-between gap-2 pb-2'>
                <span>Ship Date:</span>
                {isLoading ? (
                  <Skeleton className='h-4 w-30' />
                ) : (
                  <span className='font-semibold'>
                    {order?.ship_date ? format(order?.ship_date, DATE_FORMAT.weekdayShort) : '-'}
                  </span>
                )}
              </div>
              <div className='flex items-center justify-between gap-2 pb-2'>
                <span>Status:</span>
                {isLoading ? (
                  <Skeleton className='h-4 w-40' />
                ) : (
                  <OrderStatusBadge status={order?.sales_order?.status ?? null} />
                )}
              </div>
            </div>

            <div className='flex min-w-0 items-center gap-2'>
              <TrimLocationMenu
                disabled={
                  order?.sales_order?.status === 'wrapped' ||
                  order?.sales_order?.status === 'delivered'
                }
                className='flex-[2.5]'
                locationId={locationId}
                setLocation={setLocationId}
              />

              <Button
                isLoading={multicreateMutation.isPending}
                disabled={
                  !locationId || multicreateMutation.isPending || totalWrappedQuantity === 0
                }
                className='flex-1'
                onClick={() => handleCreatePackage({ printSticker: false })}
              >
                <RiCheckboxCircleFill />
                <span>Create Package</span>
              </Button>
              <Button
                isLoading={multicreateMutation.isPending}
                disabled={
                  !locationId || multicreateMutation.isPending || totalWrappedQuantity === 0
                }
                onClick={() => handleCreatePackage({ printSticker: true })}
                variant='info'
                className='flex-1'
              >
                <RiPrinterLine />
                <span>Create & Print</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {order && multicreateMutation.data && openStickerDialog ? (
        <PrintStickerDialog
          definition={packageSticker}
          entity={multicreateMutation.data}
          order={order}
          open={openStickerDialog}
          setOpen={(open) => {
            setOpenStickerDialog(open)
          }}
        />
      ) : null}
    </>
  )
}
