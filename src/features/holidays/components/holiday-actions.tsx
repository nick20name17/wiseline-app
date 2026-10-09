import { RowActions } from '@/components/row-actions'
import { formatLongDate } from '@/lib/days'
import { useDeleteHoliday, type Holiday } from '../api'
import { UpdateHolidayDialog } from './holiday-dialog'

type HolidayActionsProps = {
  holiday: Holiday
  onSaved: (date: string) => void
}

export const HolidayActions = ({ holiday, onSaved }: HolidayActionsProps) => {
  const deletion = useDeleteHoliday()

  return (
    <RowActions
      name={holiday.name}
      edit={dialog => <UpdateHolidayDialog holiday={holiday} onSaved={onSaved} {...dialog} />}
      remove={{
        title: `Delete ${holiday.name}?`,
        description: `${formatLongDate(holiday.date)} becomes a work day again and can be scheduled onto.`,
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(holiday.id)
      }}
    />
  )
}
