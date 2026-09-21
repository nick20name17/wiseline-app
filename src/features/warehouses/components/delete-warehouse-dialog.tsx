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
import { useDeleteWarehouse, type Warehouse } from '../api'

type DeleteWarehouseDialogProps = {
  warehouse: Warehouse
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeleteWarehouseDialog = ({
  warehouse,
  open,
  onOpenChange
}: DeleteWarehouseDialogProps) => {
  const mutation = useDeleteWarehouse(() => onOpenChange(false))
  const locations = warehouse.locations.length

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete warehouse {warehouse.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {/* The API refuses the delete in this case, so say it before the request goes out. */}
            {locations
              ? `It still holds ${locations} ${locations === 1 ? 'location' : 'locations'}. Move or remove them first.`
              : 'This cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            disabled={mutation.isPending || locations > 0}
            onClick={() => mutation.mutate(warehouse.id)}
          >
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
