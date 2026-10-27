import { RowActions } from '@/components/row-actions'
import { useDeleteWarehouse, type Warehouse } from '../api'
import { UpdateWarehouseDialog } from './warehouse-dialog'

export const WarehouseActions = ({ warehouse }: { warehouse: Warehouse }) => {
  // The schema lets the name be null, though the database always has one.
  const name = warehouse.name ?? `#${warehouse.id}`
  const deletion = useDeleteWarehouse()
  const locations = warehouse.locations.length

  return (
    <RowActions
      name={name}
      edit={dialog => <UpdateWarehouseDialog warehouse={warehouse} {...dialog} />}
      remove={{
        title: `Delete warehouse ${name}?`,
        // The API refuses the delete in this case, so say it before the request goes out.
        description: locations
          ? `It still holds ${locations} ${locations === 1 ? 'location' : 'locations'}. Move or remove them first.`
          : 'This cannot be undone.',
        blocked: locations > 0,
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(warehouse.id)
      }}
    />
  )
}
