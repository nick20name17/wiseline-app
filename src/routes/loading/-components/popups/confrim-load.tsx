import { RiCheckboxCircleLine, RiCloseCircleLine } from '@remixicon/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import type { SingleLoad } from '@/api/loads/schema'
import { loadsService } from '@/api/loads/service'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface OrdersTablePopupProps {
  load: SingleLoad
}

export const ConfirmLoadPopup = ({ load }: OrdersTablePopupProps) => {
  const allPackagesLoaded = load?.packages?.length ? load.packages.every((p) => p.is_loaded) : true
  const allSkidsLoaded = load?.skids?.length ? load.skids.every((s) => s.is_loaded) : true

  const isVisible = allPackagesLoaded && allSkidsLoaded && !load.is_loaded

  const [open, setOpen] = useState(isVisible)

  const updateLoadMutation = useMutation({
    mutationFn: loadsService.update,
    onSuccess: () => {
      toast.success('Marked as loaded successfully')
      setOpen(false)
    }
  })

  const handleLoadConfirm = () => {
    updateLoadMutation.mutate({
      id: load.id,
      payload: {
        is_loaded: true
      }
    })
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger className='fixed bottom-8 left-1/2 z-10 -translate-x-1/2' />
      <PopoverContent
        className='w-55 p-2'
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className='flex items-center gap-1.5 [&_button]:flex-1'>
          <Button
            variant='outline'
            onClick={() => setOpen(false)}
            disabled={updateLoadMutation.isPending}
          >
            <RiCloseCircleLine />
            <span>Cancel</span>
          </Button>
          <Button
            onClick={handleLoadConfirm}
            isLoading={updateLoadMutation.isPending}
            disabled={updateLoadMutation.isPending || load.is_loaded}
          >
            <RiCheckboxCircleLine />
            <span>Confirm</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
