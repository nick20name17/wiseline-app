import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Truck } from '../api'
import { DeleteTruckDialog } from './delete-truck-dialog'
import { UpdateTruckDialog } from './truck-dialog'

type TruckActionsProps = {
  truck: Truck
}

export const TruckActions = ({ truck }: TruckActionsProps) => {
  const [dialog, setDialog] = useState<'update' | 'delete' | null>(null)

  return (
    <div className='flex justify-end gap-1 text-muted-foreground'>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Edit ${truck.name}`}
        onClick={() => setDialog('update')}
      >
        <Pencil />
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Delete ${truck.name}`}
        onClick={() => setDialog('delete')}
      >
        <Trash2 />
      </Button>

      <UpdateTruckDialog
        truck={truck}
        open={dialog === 'update'}
        onOpenChange={open => setDialog(open ? 'update' : null)}
      />
      <DeleteTruckDialog
        truck={truck}
        open={dialog === 'delete'}
        onOpenChange={open => setDialog(open ? 'delete' : null)}
      />
    </div>
  )
}
