import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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
  /** The answer takes something away that cannot be put back, so it is red, not the primary blue. */
  destructive?: boolean
  onConfirm: () => void
}

/** The board's «are you sure» — a question, its consequence, and the two answers. */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  onOpenChangeComplete,
  title,
  description,
  confirmLabel,
  cancelLabel = 'No',
  isPending = false,
  destructive = false,
  onConfirm
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
    <DialogContent className='sm:max-w-md'>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant='outline' onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'default'}
          disabled={isPending}
          onClick={onConfirm}
        >
          {isPending ? <Spinner data-icon='inline-start' /> : null}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
