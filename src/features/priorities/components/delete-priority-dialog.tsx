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
import { useDeletePriority, type Priority } from '../api'

type DeletePriorityDialogProps = {
  priority: Priority
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeletePriorityDialog = ({
  priority,
  open,
  onOpenChange
}: DeletePriorityDialogProps) => {
  const mutation = useDeletePriority(() => onOpenChange(false))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete priority {priority.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Orders carrying it lose it and sort as unprioritised. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(priority.id)}
          >
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
