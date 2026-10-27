import { RowActions } from '@/components/row-actions'
import { useDeleteUser, type User } from '../api'
import { fullName } from '../lib/name'
import { UpdateUserDialog } from './user-dialog'

export const UserActions = ({ user }: { user: User }) => {
  const deletion = useDeleteUser()

  return (
    <RowActions
      name={fullName(user) || user.email}
      edit={dialog => <UpdateUserDialog user={user} {...dialog} />}
      remove={{
        title: `Delete ${user.email}?`,
        description: 'The account loses access immediately. This cannot be undone.',
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(user.id)
      }}
    />
  )
}
