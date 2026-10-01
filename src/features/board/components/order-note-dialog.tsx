import { OrderNoteDialog as NoteDialog } from '@/components/order-note-dialog'
import { useSetOrderNoteRead, type BoardOrder, type OrderNote } from '../api'

type OrderNoteDialogProps = {
  /** The order the note hangs off; `null` closes the dialog. */
  order: BoardOrder | null
  notes: Record<string, OrderNote> | undefined
  onOpenChange: (open: boolean) => void
}

/** The board's Order Notes window, read and acknowledged through the board's own calls. */
export const OrderNoteDialog = ({ order, notes, onOpenChange }: OrderNoteDialogProps) => {
  const mutation = useSetOrderNoteRead()
  return (
    <NoteDialog
      order={order}
      notes={notes}
      isPending={mutation.isPending}
      onSetRead={(id, read, onDone) => mutation.mutate({ order: id, read }, { onSuccess: onDone })}
      onOpenChange={onOpenChange}
    />
  )
}
