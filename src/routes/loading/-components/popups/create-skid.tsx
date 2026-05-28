import { RiAddCircleLine, RiCloseCircleLine } from '@remixicon/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Row, Table } from '@tanstack/react-table'
import { useEffect, useState } from 'react'

import { LOADS_QUERY_KEYS } from '@/api/loads/query'
import { PACKAGES_QUERY_KEYS } from '@/api/packages/query'
import type { Package } from '@/api/packages/schema'
import { packageService } from '@/api/packages/service'
import { SKIDS_QUERY_KEYS } from '@/api/skids/query'
import type { Skids } from '@/api/skids/schema'
import { skidsService } from '@/api/skids/service'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const CreateSkidPopup = ({ table }: { table: Table<Package | Skids> }) => {
  const [isCanceled, setIsCanceled] = useState(false)

  const queryClient = useQueryClient()

  const selectedPackageRows = table
    .getSelectedRowModel()
    .rows.filter((row) => 'package_items' in row.original) as Row<Package>[]

  const count = selectedPackageRows.length

  const isVisible = count > 0 && !isCanceled

  useEffect(() => {
    if (count === 0) setIsCanceled(false)
  }, [count])

  const handleCancel = () => {
    table.resetRowSelection()
    setIsCanceled(true)
  }

  const updatePackagesMutation = useMutation({
    mutationFn: packageService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PACKAGES_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: SKIDS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: LOADS_QUERY_KEYS.all() })
      table.resetRowSelection()
      setIsCanceled(true)
    }
  })

  const createSkidMutation = useMutation({
    mutationFn: skidsService.create,
    onSuccess: (skid) => {
      selectedPackageRows.forEach((row) => {
        updatePackagesMutation.mutate({
          id: row.original.id,
          payload: {
            skid_id: skid.id
          }
        })
      })
    }
  })

  const packageItems = selectedPackageRows.flatMap((row) => row.original.package_items)
  const totalPackagesQty = packageItems.reduce((acc, row) => acc + row.quantity, 0)

  const handleCreateSkid = () => {
    const lodId = selectedPackageRows?.[0]?.original?.load?.id

    if (lodId) {
      createSkidMutation.mutate({
        quantity: totalPackagesQty,
        load_id: lodId
      })
    }
  }

  return (
    <div
      className={cn(
        'shadow-top absolute inset-x-0 bottom-0 z-10 flex h-12 items-center bg-[#EEFAFF]',
        'justify-between border-t px-2.5 transition-transform duration-200',
        isVisible ? 'translate-y-0' : 'translate-y-[130%]'
      )}
    >
      <span className='text-sm'>{count} selected</span>
      <div className='flex items-center gap-2'>
        <Button
          disabled={createSkidMutation.isPending || updatePackagesMutation.isPending}
          onClick={handleCancel}
          variant='outline'
          size='sm'
          aria-label='Cancel selection'
        >
          <RiCloseCircleLine aria-hidden='true' />
          <span>Cancel</span>
        </Button>

        <Button
          disabled={createSkidMutation.isPending || updatePackagesMutation.isPending}
          onClick={handleCreateSkid}
          variant='outline'
          size='sm'
          aria-label='Cancel selection'
        >
          <RiAddCircleLine aria-hidden='true' />
          <span>Create a skid</span>
        </Button>
      </div>
    </div>
  )
}
