import { RiCheckboxCircleLine } from '@remixicon/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { getLoadQueryOptions, useUpdateLoad } from '@/api/loads/query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ordinal } from '@/utils/format'

interface ReleaseToLoadingDialogProps {
  loadId: number | undefined
}
export const ReleaseToLoadingDialog = ({ loadId }: ReleaseToLoadingDialogProps) => {
  const [open, setOpen] = useState(false)

  const { data: load } = useQuery({
    ...getLoadQueryOptions(loadId ? Number(loadId) : -1),
    enabled: !!loadId && open
  })

  const { handleUpdateLoad, isPending } = useUpdateLoad({
    onSuccess: () => {
      setOpen(false)
    }
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
    >
      <AlertDialogTrigger asChild>
        <Button disabled={!load?.road_confirmed || load.ready_to_load}>
          <RiCheckboxCircleLine />
          <span>Release To Loading</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className='sm:max-w-92'>
        <AlertDialogHeader className='sm:text-center'>
          <AlertDialogTitle>Are you sure you want to release?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to release {ordinal(load?.position ?? -1)} load for Truck{' '}
            {load?.truck.name}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='[&_button]:flex-1'>
          <AlertDialogAction
            disabled={isPending}
            asChild
          >
            <Button
              onClick={() => {
                if (loadId) {
                  handleUpdateLoad({ id: loadId, payload: { ready_to_load: true } })
                }
              }}
              disabled={isPending}
              isLoading={isPending}
            >
              Yes
            </Button>
          </AlertDialogAction>
          <AlertDialogCancel disabled={isPending}>No</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
