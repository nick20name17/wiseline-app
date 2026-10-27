import { ConfirmDialog } from '@/components/confirm-dialog'
import type { BoardOrder } from '../api'

type BypassDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: BoardOrder[]
  isPending: boolean
  onConfirm: () => void
}

export const BypassDialog = ({
  open,
  onOpenChange,
  orders,
  isPending,
  onConfirm
}: BypassDialogProps) => (
  <ConfirmDialog
    open={open}
    onOpenChange={onOpenChange}
    title={`Bypass Production — ${orders.length === 1 ? `order ${orders[0]?.invoice}` : `${orders.length} orders`}?`}
    description='Are you sure you want this order(s) to bypass all the production tabs and go straight to the wrapping stage?'
    confirmLabel='Yes, Bypass Production'
    cancelLabel='No'
    isPending={isPending}
    onConfirm={onConfirm}
  />
)
