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
import { useDeleteTruck, type Truck } from '../api'

type DeleteTruckDialogProps = {
  truck: Truck
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeleteTruckDialog = ({ truck, open, onOpenChange }: DeleteTruckDialogProps) => {
  const mutation = useDeleteTruck(() => onOpenChange(false))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete truck {truck.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The truck and its loads are removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(truck.id)}
          >
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
