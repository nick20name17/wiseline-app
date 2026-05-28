import { useMutation } from '@tanstack/react-query'

import { LOCATIONS_QUERY_KEYS } from '@/api/locations/query'
import type { Location } from '@/api/locations/schema'
import { locationsService } from '@/api/locations/service'
import { ConfirmDeleteDialog } from '@/components/common/dialogs/confirm-delete'
import type { ModalState } from '@/types/modal'

interface DeleteLocationModalProps extends ModalState {
  location: Location
}

export const DeleteLocationModal = ({ location, open, setOpen }: DeleteLocationModalProps) => {
  const { mutate, isPending } = useMutation({
    mutationFn: locationsService.delete,
    onSuccess: (_, __, ___, context) => {
      setOpen(false)
      context.client.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEYS.lists() })
    }
  })

  return (
    <ConfirmDeleteDialog
      onDelete={() => mutate(location.id)}
      setOpen={setOpen}
      open={open}
      isPending={isPending}
    />
  )
}
