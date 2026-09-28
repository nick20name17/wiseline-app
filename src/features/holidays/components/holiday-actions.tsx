import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Holiday } from '../api'
import { DeleteHolidayDialog } from './delete-holiday-dialog'
import { UpdateHolidayDialog } from './holiday-dialog'

type HolidayActionsProps = {
  holiday: Holiday
  onSaved: (date: string) => void
}

export const HolidayActions = ({ holiday, onSaved }: HolidayActionsProps) => {
  const [dialog, setDialog] = useState<'update' | 'delete' | null>(null)

  return (
    <div className='flex justify-end gap-1 text-muted-foreground'>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Edit ${holiday.name}`}
        onClick={() => setDialog('update')}
      >
        <Pencil />
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Delete ${holiday.name}`}
        onClick={() => setDialog('delete')}
      >
        <Trash2 />
      </Button>

      <UpdateHolidayDialog
        holiday={holiday}
        open={dialog === 'update'}
        onOpenChange={open => setDialog(open ? 'update' : null)}
        onSaved={onSaved}
      />
      <DeleteHolidayDialog
        holiday={holiday}
        open={dialog === 'delete'}
        onOpenChange={open => setDialog(open ? 'delete' : null)}
      />
    </div>
  )
}
