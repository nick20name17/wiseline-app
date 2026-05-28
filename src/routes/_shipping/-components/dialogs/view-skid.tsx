import { RiEyeFill } from '@remixicon/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { PackagesTable } from '../../dispatch/-components/tables/packages'

import { getSkidQueryOptions } from '@/api/skids/query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ViewSkidDialogProps {
  className?: string
  skidId: number | undefined
}

export const ViewSkidDialog = ({ className, skidId }: ViewSkidDialogProps) => {
  const [open, setOpen] = useState(false)

  const { data: skid, isLoading } = useQuery({
    ...getSkidQueryOptions(skidId!),
    enabled: !!skidId && open
  })

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button
          disabled={!skidId}
          size='sm'
          variant='outline'
          className={cn('h-7', className)}
        >
          <RiEyeFill />
          <span>View Skid</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='flex h-[calc(100vh-8rem)] flex-col gap-3.5 sm:max-w-7xl'>
        <DialogHeader>
          <DialogTitle>Skid {skid?.id}</DialogTitle>
        </DialogHeader>

        <PackagesTable
          data={skid?.packages ?? []}
          isLoading={isLoading}
          columnVisibility={{
            load_checkbox: false,
            checkbox: false,
            view_skid: false
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
