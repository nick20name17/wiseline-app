import { RiCloseCircleLine } from '@remixicon/react'
import type { Table } from '@tanstack/react-table'
import { useEffect, useState } from 'react'

import { AssignTruckDialog } from '../dialogs/assign-truck'

import type { Package } from '@/api/packages/schema'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const AssignTruckPopup = ({ table }: { table: Table<Package> }) => {
  const [open, setOpen] = useState(false)

  const [isCanceled, setIsCanceled] = useState(false)
  const selectedRows = table.getSelectedRowModel().rows
  const count = selectedRows.length
  const isVisible = count > 0 && !isCanceled

  useEffect(() => {
    if (count === 0) setIsCanceled(false)
  }, [count])

  const handleCancel = () => {
    table.resetRowSelection()
    setIsCanceled(true)
  }

  const selectedPackages = selectedRows.map((row) => row.original)

  return (
    <div
      className={cn(
        'bg-muted shadow-top absolute inset-x-0 bottom-0 z-10 flex h-12 items-center',
        'justify-between border-t px-2.5 transition-transform duration-200',
        isVisible ? 'translate-y-0' : 'translate-y-[130%]'
      )}
    >
      <span className='text-sm'>{count} selected</span>
      <div className='flex items-center gap-2'>
        <AssignTruckDialog
          key={
            selectedPackages?.[0]?.package_items?.[0]?.origin_item?.item?.production_date ??
            'default'
          }
          onAssign={handleCancel}
          selectedItems={{ packages: selectedPackages }}
          open={open}
          setOpen={setOpen}
        />

        <Button
          onClick={handleCancel}
          variant='outline'
          size='sm'
          aria-label='Cancel selection'
        >
          <RiCloseCircleLine aria-hidden='true' />
          <span>Cancel</span>
        </Button>
      </div>
    </div>
  )
}
