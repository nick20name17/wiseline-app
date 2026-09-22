import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useDeleteUser, type User } from '../api'

type DeleteUserDialogProps = {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeleteUserDialog = ({ user, open, onOpenChange }: DeleteUserDialogProps) => {
  const mutation = useDeleteUser(() => onOpenChange(false))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {user.email}?</AlertDialogTitle>
          <AlertDialogDescription>
            The account loses access immediately. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(user.id)}
          >
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
