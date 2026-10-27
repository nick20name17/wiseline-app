import { RowActions } from '@/components/row-actions'
import { formatLongDate } from '@/lib/days'
import { useDeleteException, type DayException } from '../api'
import { UpdateExceptionDialog } from './exception-dialog'

type ExceptionActionsProps = {
  exception: DayException
  onSaved: (date: string) => void
}

export const ExceptionActions = ({ exception, onSaved }: ExceptionActionsProps) => {
  const deletion = useDeleteException()

  return (
    <RowActions
      name={exception.name}
      edit={dialog => <UpdateExceptionDialog exception={exception} onSaved={onSaved} {...dialog} />}
      remove={{
        title: `Delete ${exception.name}?`,
        description:
          exception.kind === 'holiday'
            ? `${formatLongDate(exception.date)} becomes a work day again and can be scheduled onto.`
            : `${formatLongDate(exception.date)} is off again, as its weekday is, and nothing can be scheduled onto it.`,
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(exception)
      }}
    />
  )
}
