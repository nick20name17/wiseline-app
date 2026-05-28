import { RiCheckboxCircleFill, RiCloseCircleFill } from '@remixicon/react'
import { useIsMutating } from '@tanstack/react-query'
import { useState } from 'react'

import type { Order } from '@/api/orders/schema'
import { useUpsertSalesOrder } from '@/api/sales-orders/query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth'

interface RtpToggleProps {
  className?: string
  order: Order
  readonly?: boolean
}

export const RtpToggle = ({ className, order, readonly: externalReadonly }: RtpToggleProps) => {
  const { user } = useAuth()

  const isUpdatingSalesOrder = useIsMutating({ mutationKey: ['update-sales-order'] }) > 0
  const isCreatingSalesOrder = useIsMutating({ mutationKey: ['create-sales-order'] }) > 0

  const someOriginItemWrappedOrShipped = order.origin_items.some(
    (originItem) => originItem.item?.status === 'wrapped' || originItem.item?.status === 'shipped'
  )

  const readonly =
    (user?.role !== 'admin' && user?.role !== 'super_manager') ||
    externalReadonly ||
    someOriginItemWrappedOrShipped

  const salesOrder = order?.sales_order

  const [openConfirm, setOpenConfirm] = useState(false)
  const [pendingValue, setPendingValue] = useState<boolean | null>(null)

  const disabled = !order.origin_items
    .filter((originItem) => originItem.category !== 'Accessories')
    .every((originItem) => originItem.item?.flow && originItem?.item?.production_date)

  const initialReleased = !!salesOrder?.release_to_production
  const [released, setReleased] = useState(initialReleased)

  const { handleUpsertSalesOrders } = useUpsertSalesOrder({
    onError: () => {
      setReleased(initialReleased)
    }
  })

  const applyChange = (value: boolean) => {
    setReleased(value)

    handleUpsertSalesOrders([
      {
        id: salesOrder?.id,
        payload: {
          order: order.id,
          release_to_production: value
        }
      }
    ])
  }

  const handleToggleReleased = (value: boolean) => {
    // Turning OFF → requires confirmation
    if (!value) {
      setPendingValue(value)
      setOpenConfirm(true)
      return
    }

    // Turning ON → apply immediately
    applyChange(true)
  }

  // Confirm dialog actions
  const confirmCancelRelease = () => {
    if (pendingValue === false) {
      applyChange(false)
    }
    setOpenConfirm(false)
    setPendingValue(null)
  }

  const cancelDialog = () => {
    setReleased(true) // revert toggle
    setPendingValue(null)
    setOpenConfirm(false)
  }

  return (
    <>
      <Toggle
        disabled={disabled || isUpdatingSalesOrder || isCreatingSalesOrder}
        pressed={released}
        onPressedChange={handleToggleReleased}
        className={cn(
          'h-full justify-start border-none px-0 hover:bg-transparent data-[state=on]:bg-transparent',
          readonly ? 'pointer-events-none' : '',
          className
        )}
      >
        {released ? (
          <>
            <RiCheckboxCircleFill className='text-primary' />
            <span>Released</span>
          </>
        ) : (
          <>
            <RiCloseCircleFill />
            <span>Unreleased</span>
          </>
        )}
      </Toggle>

      <ConfirmCancelingReleasedProductionDialog
        open={openConfirm}
        setOpen={setOpenConfirm}
        onCancel={cancelDialog}
        onContinue={confirmCancelRelease}
      />
    </>
  )
}

interface ConfirmCancelingReleasedProductionDialogProps {
  onCancel: () => void
  onContinue: () => void
  open: boolean
  setOpen: (open: boolean) => void
}

const ConfirmCancelingReleasedProductionDialog = ({
  open,
  setOpen,
  onCancel,
  onContinue
}: ConfirmCancelingReleasedProductionDialogProps) => {
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
    >
      <AlertDialogContent className='sm:max-w-82'>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel release to production?</AlertDialogTitle>

          <AlertDialogDescription>
            The order will no longer be released to production.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className='**:flex-1'>
          <AlertDialogCancel onClick={onCancel}>No</AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>Yes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
