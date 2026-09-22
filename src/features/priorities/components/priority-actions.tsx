import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Priority } from '../api'
import { DeletePriorityDialog } from './delete-priority-dialog'
import { UpdatePriorityDialog } from './priority-dialog'

export const PriorityActions = ({ priority }: { priority: Priority }) => {
  const [dialog, setDialog] = useState<'update' | 'delete' | null>(null)

  return (
    <div className='flex justify-end gap-1 text-muted-foreground'>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Edit ${priority.name}`}
        onClick={() => setDialog('update')}
      >
        <Pencil />
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Delete ${priority.name}`}
        onClick={() => setDialog('delete')}
      >
        <Trash2 />
      </Button>

      <UpdatePriorityDialog
        priority={priority}
        open={dialog === 'update'}
        onOpenChange={open => setDialog(open ? 'update' : null)}
      />
      <DeletePriorityDialog
        priority={priority}
        open={dialog === 'delete'}
        onOpenChange={open => setDialog(open ? 'delete' : null)}
      />
    </div>
  )
}
