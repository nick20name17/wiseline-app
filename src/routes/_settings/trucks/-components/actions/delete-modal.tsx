import { useMutation } from '@tanstack/react-query'

import { TRUCKS_QUERY_KEYS } from '@/api/trucks/query'
import type { Truck } from '@/api/trucks/schema'
import { trucksService } from '@/api/trucks/service'
import { ConfirmDeleteDialog } from '@/components/common/dialogs/confirm-delete'
import type { ModalState } from '@/types/modal'

interface DeleteTruckModalProps extends ModalState {
  truck: Truck
}

export const DeleteTruckModal = ({ truck, open, setOpen }: DeleteTruckModalProps) => {
  const { mutate, isPending } = useMutation({
    mutationFn: trucksService.delete,
    onSuccess: (_, __, ___, context) => {
      setOpen(false)
      context.client.invalidateQueries({ queryKey: TRUCKS_QUERY_KEYS.lists() })
    }
  })

  return (
    <ConfirmDeleteDialog
      onDelete={() => mutate(truck.id)}
      setOpen={setOpen}
      open={open}
      isPending={isPending}
    />
  )
}
