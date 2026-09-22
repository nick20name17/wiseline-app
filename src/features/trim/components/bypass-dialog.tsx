import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { TrimOrder } from '../api'

type BypassDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: TrimOrder[]
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
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Bypass Production —{' '}
          {orders.length === 1 ? `order ${orders[0]?.invoice}` : `${orders.length} orders`}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want this order(s) to bypass all the production tabs and go straight to
          the wrapping stage?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel render={<Button variant='outline' />}>No</AlertDialogCancel>
        <Button disabled={isPending} onClick={onConfirm}>
          {isPending ? <Spinner data-icon='inline-start' /> : null}
          Yes, Bypass Production
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
