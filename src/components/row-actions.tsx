import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

type RowActionsProps = {
  /** What the row is called, for the buttons' labels. */
  name: string
  /** The row's edit dialog, opened by the pencil. */
  edit: (dialog: { open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode
  remove: {
    title: string
    description: string
    /** The API would refuse the delete; the description says why. */
    blocked?: boolean
    isPending: boolean
    /** Resolves once the row is gone. A failure is toasted by the query client, so it is ignored here. */
    onConfirm: () => Promise<unknown>
  }
}

/** A settings table row's edit and delete buttons, with the dialogs they open. */
export const RowActions = ({ name, edit, remove }: RowActionsProps) => {
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)

  return (
    <div className='flex justify-end gap-1 text-muted-foreground'>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Edit ${name}`}
        onClick={() => setDialog('edit')}
      >
        <Pencil />
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Delete ${name}`}
        onClick={() => setDialog('delete')}
      >
        <Trash2 />
      </Button>

      {edit({ open: dialog === 'edit', onOpenChange: open => setDialog(open ? 'edit' : null) })}
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
            () => setDialog(null),
            () => {}
          )
        }
      />
    </div>
  )
}
