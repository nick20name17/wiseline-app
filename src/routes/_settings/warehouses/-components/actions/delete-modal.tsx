import { useMutation } from '@tanstack/react-query'

import { WAREHOUSES_QUERY_KEYS } from '@/api/warehouses/query'
import type { Warehouse } from '@/api/warehouses/schema'
import { warehousesService } from '@/api/warehouses/service'
import { ConfirmDeleteDialog } from '@/components/common/dialogs/confirm-delete'
import type { ModalState } from '@/types/modal'

interface DeleteWarehouseModalProps extends ModalState {
  warehouse: Warehouse
}

export const DeleteWarehouseModal = ({ warehouse, open, setOpen }: DeleteWarehouseModalProps) => {
  const { mutate, isPending } = useMutation({
    mutationFn: warehousesService.delete,
    onSuccess: (_, __, ___, context) => {
      setOpen(false)
      context.client.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEYS.lists() })
    }
  })

  return (
    <ConfirmDeleteDialog
      onDelete={() => mutate(warehouse.id)}
      setOpen={setOpen}
      open={open}
      isPending={isPending}
    />
  )
}
