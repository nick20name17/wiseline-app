import { useMutation } from '@tanstack/react-query'

import { PRIORITIES_QUERY_KEYS } from '@/api/priorities/query'
import type { Priority } from '@/api/priorities/schema'
import { prioritiesService } from '@/api/priorities/service'
import { ConfirmDeleteDialog } from '@/components/common/dialogs/confirm-delete'
import type { ModalState } from '@/types/modal'

interface DeletePriorityModalProps extends ModalState {
  priority: Priority
}

export const DeletePriorityModal = ({ priority, open, setOpen }: DeletePriorityModalProps) => {
  const { mutate, isPending } = useMutation({
    mutationFn: prioritiesService.delete,
    onSuccess(_, __, ___, context) {
      setOpen(false)
      context.client.invalidateQueries({ queryKey: PRIORITIES_QUERY_KEYS.lists() })
    }
  })

  return (
    <ConfirmDeleteDialog
      onDelete={() => mutate(priority.id)}
      setOpen={setOpen}
      open={open}
      isPending={isPending}
    />
  )
}
