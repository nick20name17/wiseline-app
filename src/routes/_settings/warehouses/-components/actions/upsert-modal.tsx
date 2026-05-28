import { RiAddCircleLine } from '@remixicon/react'
import { useState } from 'react'

import { useUpsertWarehouse } from '@/api/warehouses/query'
import { CreateWarehousesSchema, type Warehouse } from '@/api/warehouses/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { useAppForm } from '@/hooks/app-form'
import type { ModalState } from '@/types/modal'

interface UpsertWarehouseFormProps {
  onSuccess: () => void
  warehouse?: Warehouse
}

const UpsertWarehouseForm = ({ warehouse, onSuccess }: UpsertWarehouseFormProps) => {
  const isEdit = !!warehouse

  const { handleUpsertWarehouse, isPending } = useUpsertWarehouse({
    onSuccess: () => {
      onSuccess()
      if (!isEdit) form.reset()
    }
  })

  const form = useAppForm({
    defaultValues: {
      name: warehouse?.name ?? '',
      code: warehouse?.code ?? '',
      address: warehouse?.address ?? '',
      ...(warehouse?.description ? { description: warehouse?.description } : {}),
      position: warehouse?.position ?? undefined
    },
    validators: {
      onSubmit: CreateWarehousesSchema
    },
    onSubmit: async ({ value }) => {
      const payload = CreateWarehousesSchema.parse(value)
      handleUpsertWarehouse({ id: warehouse?.id, payload })
    }
  })

  return (
    <form
      className='space-y-4'
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.AppField
        name='name'
        children={(field) => (
          <field.TextField
            label='Name'
            placeholder='Warehouse Name'
          />
        )}
      />

      <div className='grid grid-cols-2 gap-3.5'>
        <form.AppField
          name='code'
          children={(field) => (
            <field.TextField
              label='Code'
              placeholder='code123'
            />
          )}
        />

        <form.AppField
          name='position'
          children={(field) => (
            <field.NumberField
              label='Position'
              placeholder='123'
            />
          )}
        />
      </div>

      <form.AppField
        name='address'
        children={(field) => (
          <field.TextField
            label='Address'
            placeholder='123 Main St'
          />
        )}
      />

      <form.AppField
        name='description'
        children={(field) => (
          <field.TextAreaField
            label='Description'
            placeholder='Enter warehouse description'
          />
        )}
      />

      <Button
        type='submit'
        className='w-24'
        disabled={isPending}
        isLoading={isPending}
      >
        {isEdit ? 'Update' : 'Create'}
      </Button>
    </form>
  )
}

export const CreateWarehouseModal = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button>
          <RiAddCircleLine />
          <span>Create warehouse</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create warehouse</DialogTitle>
        </DialogHeader>

        <UpsertWarehouseForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

interface UpdateWarehouseModalProps extends ModalState {
  warehouse?: Warehouse
}

export const UpdateWarehouseModal = ({ warehouse, open, setOpen }: UpdateWarehouseModalProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update warehouse</DialogTitle>
        </DialogHeader>

        <UpsertWarehouseForm
          warehouse={warehouse}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
