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
import { toast } from '@/components/ui/toast'
import { useDeleteMachine, type Machine } from '../api'

type DeleteMachineDialogProps = {
  machine: Machine
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeleteMachineDialog = ({ machine, open, onOpenChange }: DeleteMachineDialogProps) => {
  const mutation = useDeleteMachine(() => onOpenChange(false))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete machine {machine.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Its tab goes with it, and the line items routed to it are left without a machine. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(machine.id, {
                // The API refuses a machine that still holds work, and only it knows that.
                onError: error =>
                  toast.add({
                    type: 'error',
                    title: 'The machine stayed',
                    description: error.message
                  })
              })
            }
          >
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
