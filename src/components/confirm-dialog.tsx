import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useDrawer } from '@/hooks/use-mobile'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenChangeComplete?: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  isPending?: boolean
  /** The answer is not on offer yet; the description says why. */
  disabled?: boolean
  /** The answer takes something away that cannot be put back, so it is red, not the primary blue. */
  destructive?: boolean
  onConfirm: () => void
}

/** The app's «are you sure» — a question, its consequence, and the two answers. */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  onOpenChangeComplete,
  title,
  description,
  confirmLabel,
  cancelLabel = 'No',
  isPending = false,
  disabled = false,
  destructive = false,
  onConfirm
}: ConfirmDialogProps) => {
  const mobile = useDrawer(open)
  const confirm = (
    <Button
      variant={destructive ? 'destructive' : 'default'}
      disabled={isPending || disabled}
      onClick={onConfirm}
    >
      {isPending ? <Spinner data-icon='inline-start' /> : null}
      {confirmLabel}
    </Button>
  )

  // A phone asks from the bottom of the screen, as its own action sheets do.
  if (mobile)
    return (
      <Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant='outline' />}>{cancelLabel}</DialogClose>
            {confirm}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          {confirm}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
