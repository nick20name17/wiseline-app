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
}: ConfirmDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <Button
          variant={destructive ? 'destructive' : 'default'}
          disabled={isPending || disabled}
          onClick={onConfirm}
        >
          {isPending ? <Spinner data-icon='inline-start' /> : null}
          {confirmLabel}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
