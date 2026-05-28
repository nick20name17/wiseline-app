import { RiDeleteBinFill, RiEditFill, RiMoreFill } from '@remixicon/react'
import { useState } from 'react'

import { DeleteFlowModal } from './delete-modal'
import { UpdateFlowModal } from './upsert-modal'
import type { Flow } from '@/api/flows/schema'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface FlowsActionsMenuProps {
  flow: Flow
  categoryId: string
}

export const FlowsActionsMenu = ({ flow, categoryId }: FlowsActionsMenuProps) => {
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
      <DeleteFlowModal
        open={openDialog === 'delete'}
        setOpen={(isOpen) => setOpenDialog(isOpen ? 'delete' : null)}
        flow={flow}
      />
      <UpdateFlowModal
        categoryId={categoryId}
        flow={flow}
        open={openDialog === 'update'}
        setOpen={(isOpen) => setOpenDialog(isOpen ? 'update' : null)}
      />
    </>
  )
}
