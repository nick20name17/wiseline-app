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
  <button
    type='button'
    data-fills-cell
    aria-label={label}
    title={label}
    // In a table the cell is the button, as with a priority: a 28px square in a wide column is a
    // small target for a column given to it. Its `::after` takes the cell, so the button itself is
    // not positioned there, and the ring moves to the cell's edge. In a card it stays a ghost button
    // in the card's corner. Not the shadcn button, which owns its box and ring.
    className={cn(
      'inline-flex size-7 cursor-pointer items-center justify-center rounded-md outline-none after:absolute',
      'max-lg:relative max-lg:hover:bg-muted max-lg:focus-visible:ring-3 max-lg:focus-visible:ring-ring/50',
      'lg:after:inset-0 lg:after:ring-inset lg:focus-visible:after:ring-2 lg:focus-visible:after:ring-ring/50'
    )}
    onClick={event => {
      event.stopPropagation()
      onClick()
    }}
  >
    {/* The dot sits on the icon, which holds it wherever the button is placed. */}
    <span className='relative'>
      <MessageSquare
        className={cn(
          'block size-4',
          state === 'unread' && 'text-destructive',
          state === 'read' && 'text-success',
          state === 'none' && 'text-muted-foreground'
        )}
      />
      {state === 'none' ? null : (
        <span
          aria-hidden
          className={cn(
            'absolute -top-0.5 -right-0.5 size-1.5 rounded-full',
            state === 'unread' ? 'bg-destructive' : 'bg-success'
          )}
        />
      )}
    </span>
  </button>
)
