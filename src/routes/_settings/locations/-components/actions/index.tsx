import { RiDeleteBinFill, RiEditFill, RiMoreFill } from '@remixicon/react'
import { useState } from 'react'

import { DeleteLocationModal } from './delete-modal'
import { UpdateLocationModal } from './upsert-modal'
import type { Location } from '@/api/locations/schema'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface LocationsActionsMenuProps {
  location: Location
}

export const LocationsActionsMenu = ({ location }: LocationsActionsMenuProps) => {
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
      <DeleteLocationModal
        open={openDialog === 'delete'}
        setOpen={(isOpen) => setOpenDialog(isOpen ? 'delete' : null)}
        location={location}
      />
      <UpdateLocationModal
        location={location}
        open={openDialog === 'update'}
        setOpen={(isOpen) => setOpenDialog(isOpen ? 'update' : null)}
      />
    </>
  )
}
