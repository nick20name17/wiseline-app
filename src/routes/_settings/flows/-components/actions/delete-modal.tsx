import { useMutation } from '@tanstack/react-query'

import { CATEGORIES_QUERY_KEYS } from '@/api/categories/query'
import { FLOWS_QUERY_KEYS } from '@/api/flows/query'
import type { Flow } from '@/api/flows/schema'
import { flowsService } from '@/api/flows/service'
import { ConfirmDeleteDialog } from '@/components/common/dialogs/confirm-delete'
import type { ModalState } from '@/types/modal'

interface DeleteFlowModalProps extends ModalState {
  flow: Flow
}

export const DeleteFlowModal = ({ flow, open, setOpen }: DeleteFlowModalProps) => {
  const { mutate, isPending } = useMutation({
    mutationFn: flowsService.delete,
    onSuccess(_, __, ___, context) {
      setOpen(false)
      context.client.invalidateQueries({ queryKey: FLOWS_QUERY_KEYS.lists() })
      context.client.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.list() })
    }
  })

  return (
    <ConfirmDeleteDialog
      onDelete={() => mutate(flow.id)}
      setOpen={setOpen}
      open={open}
      isPending={isPending}
    />
  )
}
