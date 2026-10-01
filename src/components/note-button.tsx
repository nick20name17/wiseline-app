import { Button } from '@/components/ui/button'
import { cn } from 'cn'
import { MessageSquare } from 'lucide-react'

/** Red until somebody has dealt with the note, green once they have, plain when there is none. */
export type NoteState = 'none' | 'unread' | 'read'

type NoteButtonProps = {
  state: NoteState
  label: string
  onClick: () => void
}

export const NoteButton = ({ state, label, onClick }: NoteButtonProps) => (
  <Button
    variant='ghost'
    size='icon-sm'
    aria-label={label}
    title={label}
    className='relative'
    onClick={event => {
      event.stopPropagation()
      onClick()
    }}
  >
    <MessageSquare
      className={cn(
        state === 'unread' && 'text-destructive',
        state === 'read' && 'text-success',
        state === 'none' && 'text-muted-foreground'
      )}
    />
    {state === 'none' ? null : (
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 right-0.5 size-1.5 rounded-full',
          state === 'unread' ? 'bg-destructive' : 'bg-success'
        )}
      />
    )}
  </Button>
)
