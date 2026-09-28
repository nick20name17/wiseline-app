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
import { formatLongDate } from '@/lib/days'
import { useDeleteHoliday, type Holiday } from '../api'

type DeleteHolidayDialogProps = {
  holiday: Holiday
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeleteHolidayDialog = ({ holiday, open, onOpenChange }: DeleteHolidayDialogProps) => {
  const mutation = useDeleteHoliday(() => onOpenChange(false))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {holiday.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {formatLongDate(holiday.date)} becomes a work day again and can be scheduled onto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(holiday.id)}
          >
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
