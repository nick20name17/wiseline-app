import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

type RowActionsProps = {
  /** What the row is called, for the buttons' labels. */
  name: string
  /** The row's edit dialog, opened by the pencil. */
  edit: (dialog: { open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode
  /** None for a row that cannot be deleted: it has no delete button. */
  remove?: {
    title: string
    description: string
    /** The API would refuse the delete; the description says why. */
    blocked?: boolean
    isPending: boolean
    /** Resolves once the row is gone. A failure is toasted by the query client, so it is ignored here. */
    onConfirm: () => Promise<unknown>
  }
}

/**
 * A settings table row's edit and delete buttons, with the dialogs they open. On a card — a table
 * below `lg` — the two fold into one menu in the card's corner.
 */
export const RowActions = ({ name, edit, remove }: RowActionsProps) => {
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)

  return (
    <div className='flex justify-end gap-1 text-muted-foreground'>
      <Button
        variant='ghost'
        size='icon-sm'
        className='max-lg:hidden'
        aria-label={`Edit ${name}`}
        onClick={() => setDialog('edit')}
      >
        <Pencil />
      </Button>
      {remove ? (
        <Button
          variant='ghost'
          size='icon-sm'
          className='max-lg:hidden'
          aria-label={`Delete ${name}`}
          onClick={() => setDialog('delete')}
        >
          <Trash2 />
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant='ghost'
              size='icon'
              className='lg:hidden'
              aria-label={`Actions for ${name}`}
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='min-w-40'>
          <DropdownMenuItem onClick={() => setDialog('edit')}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          {remove ? (
            <DropdownMenuItem variant='destructive' onClick={() => setDialog('delete')}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {edit({ open: dialog === 'edit', onOpenChange: open => setDialog(open ? 'edit' : null) })}
      {remove ? (
        <ConfirmDialog
          open={dialog === 'delete'}
          onOpenChange={open => setDialog(open ? 'delete' : null)}
          title={remove.title}
          description={remove.description}
          confirmLabel='Delete'
          cancelLabel='Cancel'
          destructive
          disabled={remove.blocked}
          isPending={remove.isPending}
          onConfirm={() =>
            remove.onConfirm().then(
              // Only the delete dialog: the edit one may have been opened while the request was out.
              () => setDialog(open => (open === 'delete' ? null : open)),
              () => {}
            )
          }
        />
      ) : null}
    </div>
  )
}
