import { formatDate } from '@/lib/days'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useRetained } from '@/lib/use-retained'
import { Check, Lock, Undo2 } from 'lucide-react'

/** The salesman's note on an order, as `orders/notes/` hands it over. */
export type OrderNote = {
  has_note: boolean
  text: string | null
  author: string | null
  created_at: string | null
  read: boolean
}

type OrderNoteDialogProps = {
  /** The order the note hangs off, by its EBMS autoid and its number; `null` closes the dialog. */
  order: { id: string; invoice: string } | null
  notes: Record<string, OrderNote> | undefined
  /** Marks the note dealt with, or takes that back. Without it the note is only read. */
  onSetRead?: (order: string, read: boolean) => void
  onOpenChange: (open: boolean) => void
}

const initials = (author: string | null) =>
  (author ?? '')
    .split(' ')
    .map(word => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '—'

/**
 * An Order Note is written by the salesman in EBMS and never pushed back, so there is no composer
 * here: a reply typed in this app would never reach the person who wrote it. The checkmark is the only
 * action, and it can be taken back when made by mistake. If the salesman later edits the note it goes
 * back to unread on its own.
 */
export const OrderNoteDialog = ({
  order: current,
  notes,
  onSetRead,
  onOpenChange
}: OrderNoteDialogProps) => {
  const [order, release] = useRetained(current)
  const note = order ? notes?.[order.id] : undefined

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Order notes · {order?.invoice}</DialogTitle>
          <DialogDescription>Imported from the salesman in EBMS.</DialogDescription>
        </DialogHeader>

        {note?.has_note ? (
          <div className='flex gap-3'>
            <Avatar className='size-8'>
              <AvatarFallback>{initials(note.author)}</AvatarFallback>
            </Avatar>
            <div className='flex-1 space-y-1'>
              <div className='flex items-center gap-2'>
                {note.read ? null : (
                  <span aria-hidden className='size-1.5 rounded-full bg-destructive' />
                )}
                <span className='text-sm font-medium'>{note.author ?? 'Salesman'}</span>
                <span className='text-xs text-muted-foreground'>
                  {formatDate(note.created_at?.slice(0, 10) ?? null)}
                </span>
              </div>
              <p className='text-sm whitespace-pre-line'>{note.text}</p>
            </div>
          </div>
        ) : (
          <p className='py-6 text-center text-sm text-muted-foreground'>No note on this order.</p>
        )}

        <DialogFooter className='items-center sm:justify-between'>
          <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <Lock className='size-3.5' />
            {onSetRead ? 'Read-only — acknowledge it here.' : 'Read-only.'}
          </span>
          {!onSetRead ? null : note?.read ? (
            // Stays open: the note turning red again is the confirmation that the check was taken back.
            <Button
              variant='outline'
              disabled={!order}
              onClick={() => order && onSetRead(order.id, false)}
            >
              <Undo2 data-icon='inline-start' />
              Undo dealt with
            </Button>
          ) : (
            <Button
              disabled={!note?.has_note || !order}
              onClick={() => {
                if (!order) return
                onSetRead(order.id, true)
                onOpenChange(false)
              }}
            >
              <Check data-icon='inline-start' />
              Mark dealt with
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
