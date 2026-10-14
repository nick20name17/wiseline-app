import { RowActions } from '@/components/row-actions'
import { useDeleteTruck, type Truck } from '../api'
import { UpdateTruckDialog } from './truck-dialog'

export const TruckActions = ({ truck }: { truck: Truck }) => {
  const deletion = useDeleteTruck()

  return (
    <RowActions
      name={truck.name}
      edit={dialog => <UpdateTruckDialog truck={truck} {...dialog} />}
      remove={{
        title: `Delete truck ${truck.name}?`,
        description: 'The truck and its loads are removed. This cannot be undone.',
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(truck.id)
      }}
    />
  )
}
