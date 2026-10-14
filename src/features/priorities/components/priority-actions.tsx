import { RowActions } from '@/components/row-actions'
import { useDeletePriority, type Priority } from '../api'
import { UpdatePriorityDialog } from './priority-dialog'

type PriorityActionsProps = {
  priority: Priority
  departmentId: number
}

export const PriorityActions = ({ priority, departmentId }: PriorityActionsProps) => {
  const deletion = useDeletePriority()

  return (
    <RowActions
      name={priority.name}
      edit={dialog => (
        <UpdatePriorityDialog priority={priority} departmentId={departmentId} {...dialog} />
      )}
      remove={{
        title: `Delete priority ${priority.name}?`,
        description: 'Orders carrying it lose it and sort as unprioritised. This cannot be undone.',
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(priority.id)
      }}
    />
  )
}
