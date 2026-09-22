import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Machine } from '../api'
import { DeleteMachineDialog } from './delete-machine-dialog'
import { UpdateMachineDialog } from './machine-dialog'

type MachineActionsProps = {
  machine: Machine
}

export const MachineActions = ({ machine }: MachineActionsProps) => {
  const [dialog, setDialog] = useState<'update' | 'delete' | null>(null)

  return (
    <div className='flex justify-end gap-1 text-muted-foreground'>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Edit ${machine.name}`}
        onClick={() => setDialog('update')}
      >
        <Pencil />
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Delete ${machine.name}`}
        onClick={() => setDialog('delete')}
      >
        <Trash2 />
      </Button>

      <UpdateMachineDialog
        machine={machine}
        open={dialog === 'update'}
        onOpenChange={open => setDialog(open ? 'update' : null)}
      />
      <DeleteMachineDialog
        machine={machine}
        open={dialog === 'delete'}
        onOpenChange={open => setDialog(open ? 'delete' : null)}
      />
    </div>
  )
}
