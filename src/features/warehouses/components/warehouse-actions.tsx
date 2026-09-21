import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Warehouse } from '../api'
import { DeleteWarehouseDialog } from './delete-warehouse-dialog'
import { UpdateWarehouseDialog } from './warehouse-dialog'

type WarehouseActionsProps = {
  warehouse: Warehouse
  isDefault: boolean
}

export const WarehouseActions = ({ warehouse, isDefault }: WarehouseActionsProps) => {
  const [dialog, setDialog] = useState<'update' | 'delete' | null>(null)

  return (
    <div className='flex justify-end gap-1 text-muted-foreground'>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Edit ${warehouse.name}`}
        onClick={() => setDialog('update')}
      >
        <Pencil />
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Delete ${warehouse.name}`}
        onClick={() => setDialog('delete')}
      >
        <Trash2 />
      </Button>

      <UpdateWarehouseDialog
        warehouse={warehouse}
        isDefault={isDefault}
        open={dialog === 'update'}
        onOpenChange={open => setDialog(open ? 'update' : null)}
      />
      <DeleteWarehouseDialog
        warehouse={warehouse}
        open={dialog === 'delete'}
        onOpenChange={open => setDialog(open ? 'delete' : null)}
      />
    </div>
  )
}
