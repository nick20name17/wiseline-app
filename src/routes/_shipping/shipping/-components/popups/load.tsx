'use no memo'

import { RiCloseCircleLine, RiDeleteBin7Line } from '@remixicon/react'
import { useMutation } from '@tanstack/react-query'
import type { Table } from '@tanstack/react-table'

import { LOADS_QUERY_KEYS } from '@/api/loads/query'
import type { Package } from '@/api/packages/schema'
import { packageService } from '@/api/packages/service'
import type { Skids } from '@/api/skids/schema'
import { skidsService } from '@/api/skids/service'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const LoadPopup = ({ table }: { table: Table<Skids | Package> }) => {
  const selectedRows = table.getSelectedRowModel().rows
  const count = selectedRows.length

  const isVisible = count > 0

  const handleCancel = () => {
    table.resetRowSelection()
  }

  const packagesMultiupdateMutation = useMutation({
    mutationFn: packageService.multiupdate,
    meta: {
      invalidatesQuery: LOADS_QUERY_KEYS.all()
    }
  })

  const skidsMultiupdateMutation = useMutation({
    mutationFn: skidsService.multiupdate,
    meta: {
      invalidatesQuery: LOADS_QUERY_KEYS.all()
    }
  })

  const handleRemoveFromLoad = () => {
    const selectedPackages = selectedRows
      .map((row) => row.original)
      .filter((pack) => 'package_items' in pack)

    const selectedSkids = selectedRows
      .map((row) => row.original)
      .filter((pack) => 'packages' in pack)

    if (selectedPackages.length > 0) {
      packagesMultiupdateMutation.mutate({
        ids: selectedPackages.map((pack) => pack.id),
        loads: {
          load_id: null
        }
      })
    }

    if (selectedSkids.length > 0) {
      skidsMultiupdateMutation.mutate({
        skids: selectedSkids.map((skid) => skid.id),
        loads: {
          load_id: null
        }
      })
    }
  }

  // const handleRemoveFromTruck = () => {}

  const isRemovingFromLoad = packagesMultiupdateMutation.isPending

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
        {/* <Button
          size='sm'
          variant='outline'
          aria-label='Remove from truck'
          onClick={handleRemoveFromTruck}
        >
          <RiDeleteBin7Line aria-hidden='true' />
          <span>Remove from truck</span>
        </Button> */}
        <Button
          size='sm'
          className='w-40'
          variant='outline'
          aria-label='Remove from load'
          disabled={isRemovingFromLoad}
          isLoading={isRemovingFromLoad}
          onClick={handleRemoveFromLoad}
        >
          <RiDeleteBin7Line aria-hidden='true' />
          <span>Remove from load</span>
        </Button>
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
