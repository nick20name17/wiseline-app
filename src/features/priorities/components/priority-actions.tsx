import { RowActions } from '@/components/row-actions'
import { useDeletePriority, type Priority } from '../api'
import { UpdatePriorityDialog } from './priority-dialog'

export const PriorityActions = ({ priority }: { priority: Priority }) => {
  const deletion = useDeletePriority()

  return (
    <RowActions
      name={priority.name}
      edit={dialog => <UpdatePriorityDialog priority={priority} {...dialog} />}
      remove={{
        title: `Delete priority ${priority.name}?`,
        description: 'Orders carrying it lose it and sort as unprioritised. This cannot be undone.',
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(priority.id)
      }}
    />
  )
}
