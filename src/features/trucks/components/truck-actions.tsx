import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Truck } from '../api'
import { DeleteTruckDialog } from './delete-truck-dialog'
import { UpdateTruckDialog } from './truck-dialog'

type TruckActionsProps = {
  truck: Truck
}

export const TruckActions = ({ truck }: TruckActionsProps) => {
  // The menu has to close before a dialog opens, otherwise the two fight over focus.
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialog, setDialog] = useState<'update' | 'delete' | null>(null)

  const openDialog = (next: 'update' | 'delete') => {
    setMenuOpen(false)
    setDialog(next)
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button variant='ghost' size='icon-sm' aria-label={`Actions for ${truck.name}`} />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-32'>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openDialog('update')}>
              <Pencil />
              Update
            </DropdownMenuItem>
            <DropdownMenuItem variant='destructive' onClick={() => openDialog('delete')}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  )
}
