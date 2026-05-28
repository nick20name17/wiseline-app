import { RiMoreFill } from '@remixicon/react'
import { useState } from 'react'

import { RemanufactoredDialog, RemanufactureButton } from './remanufactored'
import type { OriginItem } from '@/api/origin-items/schema'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface WrappingActionsMenuProps {
  originItem: OriginItem
  className?: string
  without?: ('remanufacture' | 'create')[]
}

export const WrappingActionsMenu = ({
  originItem,
  className,
  without
}: WrappingActionsMenuProps) => {
  const [openDropdown, setOpenDropdown] = useState(false)
  const [activeDialog, setActiveDialog] = useState<'none' | 'remanufacture' | 'create'>('none')

  const openDialog = (dialog: 'remanufacture' | 'create') => {
    setOpenDropdown(false)
    setActiveDialog(dialog)
  }

  const closeDialog = () => setActiveDialog('none')

  return (
    <>
      <DropdownMenu
        open={openDropdown}
        onOpenChange={setOpenDropdown}
      >
        <DropdownMenuTrigger asChild>
          <Button
            className={className}
            variant='ghost'
            size='icon-sm'
          >
            <RiMoreFill />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='space-y-1.5 p-1.5 [&_button]:w-full'
          align='end'
        >
          <DropdownMenuItem asChild>
            <RemanufactureButton
              className='justify-start'
              onClick={(e) => {
                e.stopPropagation()
                openDialog('remanufacture')
              }}
            />
          </DropdownMenuItem>
          {without?.includes('create') ? null : (
            <DropdownMenuItem asChild>
              {/* <CreatePackageButton
                className='justify-start'
                onClick={() => openDialog('create')}
              /> */}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* <CreatePackageDialog
        originItem={originItem}
        open={activeDialog === 'create'}
        setOpen={(value) => (value ? openDialog('create') : closeDialog())}
      />*/}
      <RemanufactoredDialog
        originItem={originItem}
        open={activeDialog === 'remanufacture'}
        setOpen={(value) => (value ? openDialog('remanufacture') : closeDialog())}
      />
    </>
  )
}
