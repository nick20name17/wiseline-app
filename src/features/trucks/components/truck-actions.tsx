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
        description:
          // The server refuses a truck that ever had a Load or a planned order, naming the latest day.
          'Only a truck with no Loads or planned orders can be deleted. This cannot be undone.',
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(truck.id)
      }}
    />
  )
}
