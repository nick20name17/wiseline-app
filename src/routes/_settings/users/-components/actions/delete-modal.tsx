import { useMutation } from '@tanstack/react-query'

import { USERS_QUERY_KEYS } from '@/api/users/query'
import type { User } from '@/api/users/schema'
import { usersService } from '@/api/users/service'
import { ConfirmDeleteDialog } from '@/components/common/dialogs/confirm-delete'
import type { ModalState } from '@/types/modal'

interface DeleteUserModalProps extends ModalState {
  user: User
}

export const DeleteUserModal = ({ user, open, setOpen }: DeleteUserModalProps) => {
  const deleteUserMutation = useMutation({
    mutationFn: usersService.delete,
    onSuccess: (_, __, ___, context) => {
      setOpen(false)
      context.client.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() })
    }
  })

  return (
    <ConfirmDeleteDialog
      onDelete={() => deleteUserMutation.mutate(user.id)}
      setOpen={setOpen}
      open={open}
      isPending={deleteUserMutation.isPending}
    />
  )
}
