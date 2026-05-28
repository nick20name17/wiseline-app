import { RiDeleteBinFill, RiEditFill, RiMoreFill } from '@remixicon/react'
import { useState } from 'react'

import { DeletePriorityModal } from './delete-modal'
import { UpdatePriorityModal } from './upsert-modal'
import type { Priority } from '@/api/priorities/schema'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface PrioritiesActionsMenuProps {
  priority: Priority
}

export const PrioritiesActionsMenu = ({ priority }: PrioritiesActionsMenuProps) => {
  const [openDropdown, setOpenDropdown] = useState(false)
  const [openDialog, setOpenDialog] = useState<'delete' | 'update' | null>(null)

  const handleOpenDialog = (type: 'delete' | 'update') => {
    setOpenDropdown(false)
    setOpenDialog(type)
  }

  return (
    <>
      <DropdownMenu
        open={openDropdown}
        onOpenChange={setOpenDropdown}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon-sm'
          >
            <RiMoreFill />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-30 p-1.5'
          align='start'
          side='left'
        >
          <DropdownMenuItem onClick={() => handleOpenDialog('update')}>
            <RiEditFill />
            <span>Update</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('delete')}>
            <RiDeleteBinFill />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeletePriorityModal
        open={openDialog === 'delete'}
        setOpen={(isOpen) => setOpenDialog(isOpen ? 'delete' : null)}
        priority={priority}
      />
      <UpdatePriorityModal
        priority={priority}
        open={openDialog === 'update'}
        setOpen={(isOpen) => setOpenDialog(isOpen ? 'update' : null)}
      />
    </>
  )
}
