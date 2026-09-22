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
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useQuery } from '@tanstack/react-query'
import { Check, SendHorizontal } from 'lucide-react'
import { useState } from 'react'
import { lineNotesQuery, useAddLineNote, useMarkLineNoteRead } from '../api'

type LineNotesDialogProps = {
  /** The EBMS autoid of the line item; `null` closes the dialog. */
  originItem: string | null
  productId: string
  onOpenChange: (open: boolean) => void
}

// An instant, not a production day, so it is read in local time: it records when somebody wrote.
const stampFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})

const stamp = (iso: string | null) => (iso ? stampFormat.format(new Date(iso)) : '')

/**
 * Line item notes are this app's own — they neither come from EBMS nor go back to it — so unlike an
 * Order Note this one has a composer, and Managers and Workers alike can add to it at any point.
 *
 * Read state is per note: a new note turns the thread red again even where an earlier one was already
 * dealt with.
 */
export const LineNotesDialog = ({ originItem, productId, onOpenChange }: LineNotesDialogProps) => {
  const [draft, setDraft] = useState('')
  const { data: thread, isPending } = useQuery(lineNotesQuery(originItem))
  const add = useAddLineNote(originItem ?? '')
  const markRead = useMarkLineNoteRead(originItem ?? '')

  return (
    <Dialog
      open={!!originItem}
      onOpenChange={open => {
        if (!open) setDraft('')
        onOpenChange(open)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Line notes · {productId}</DialogTitle>
          <DialogDescription>Shared with the Trim team. Never pushed to EBMS.</DialogDescription>
        </DialogHeader>

        <div className='max-h-80 space-y-4 overflow-y-auto'>
          {isPending ? (
            <p className='py-6 text-center text-sm text-muted-foreground'>Loading…</p>
          ) : thread?.notes.length ? (
            thread.notes.map(note => (
              <div key={note.id} className='flex gap-3'>
                <Avatar className='size-8'>
                  <AvatarFallback>{note.author?.initials ?? '—'}</AvatarFallback>
                </Avatar>
                <div className='flex-1 space-y-1'>
                  <div className='flex items-center gap-2'>
                    {note.read ? null : (
                      <span aria-hidden className='size-1.5 rounded-full bg-destructive' />
                    )}
                    <span className='text-sm font-medium'>{note.author?.name ?? 'Unknown'}</span>
                    <span className='text-xs text-muted-foreground'>
                      {note.author?.email} · {stamp(note.created_at)}
                    </span>
                    {note.read ? (
                      <Check className='ml-auto size-3.5 text-success' aria-label='Dealt with' />
                    ) : (
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        className='ml-auto'
                        aria-label='Mark dealt with'
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate(note.id)}
                      >
                        <Check />
                      </Button>
                    )}
                  </div>
                  <p className='text-sm whitespace-pre-line'>{note.text}</p>
                </div>
              </div>
            ))
          ) : (
            <p className='py-6 text-center text-sm text-muted-foreground'>No notes yet.</p>
          )}
        </div>

        <DialogFooter className='flex-col items-stretch sm:flex-col sm:items-stretch'>
          <Textarea
            rows={2}
            placeholder='Add a note…'
            aria-label='New note'
            value={draft}
            onChange={event => setDraft(event.target.value)}
          />
          <Button
            className='self-end'
            disabled={!draft.trim() || add.isPending}
            onClick={() => add.mutate(draft.trim(), { onSuccess: () => setDraft('') })}
          >
            {add.isPending ? (
              <Spinner data-icon='inline-start' />
            ) : (
              <SendHorizontal data-icon='inline-start' />
            )}
            Add note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
