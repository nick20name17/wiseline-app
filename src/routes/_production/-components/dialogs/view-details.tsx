import { RiEyeFill } from '@remixicon/react'

import type { OriginItem } from '@/api/origin-items/schema'
import { OriginItemsTable } from '@/components/common/origin-items/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

interface ViewDetailsDialogProps {
  originItems: OriginItem[]
}

export const ViewDetailsDialog = ({ originItems }: ViewDetailsDialogProps) => {
  const { priority, gauge, color } = originItems[0]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className='w-full'
          variant='outline'
          size='sm'
        >
          <RiEyeFill className='text-muted-foreground' />
          <span>View</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='gap-3 sm:max-w-332.5'>
        <DialogHeader className='sr-only'>
          <DialogTitle>View details</DialogTitle>
        </DialogHeader>

        <div className='flex items-center gap-2'>
          {/* <div className='bg-muted flex h-9 items-center justify-center rounded-md border px-3 leading-none font-medium'>
            Cutlist ID #12
          </div> */}
          <div className='bg-muted flex h-9 items-center justify-center gap-2 rounded-md border px-3 leading-none font-medium'>
            {priority?.color ? (
              <div
                className='size-3.5 rounded-sm'
                style={{
                  backgroundColor: priority?.color
                }}
              />
            ) : null}
            Priority: {priority?.name ?? '—'}
          </div>
          <div className='bg-muted flex h-9 items-center justify-center rounded-md border px-3 leading-none font-medium'>
            Gauge: {gauge ?? '—'}
          </div>
          <div className='bg-muted flex h-9 items-center justify-center rounded-md border px-3 leading-none font-medium'>
            Color: {color ?? '—'}
          </div>
        </div>
        <OriginItemsTable
          className='max-w-322.5'
          columnVisibility={{
            production_date: false,
            customer: false,
            order: false,
            category: false,
            flow: false,
            pfs: false,
            pull_from_stock: false,
            wrapped_from: false,
            left_to_wrap: false,
            remanufacturing_from_stock_qty: false,
            remanufacturing_qty: false
          }}
          data={originItems}
        />
      </DialogContent>
    </Dialog>
  )
}
