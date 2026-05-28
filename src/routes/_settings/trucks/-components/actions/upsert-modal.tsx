import { RiAddCircleLine } from '@remixicon/react'
import { useStore } from '@tanstack/react-form'
import { useState } from 'react'

import { TruckDriverSelect } from '../selects/driver'

import { useUpsertTruck } from '@/api/trucks/query'
import { CreateTruckSchema, type Truck } from '@/api/trucks/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { useAppForm } from '@/hooks/app-form'
import type { ModalState } from '@/types/modal'

interface UpsertTruckFormProps {
  onSuccess: () => void
  truck?: Truck
}

const UpsertTruckForm = ({ truck, onSuccess }: UpsertTruckFormProps) => {
  const isEdit = !!truck

  const { handleUpsertTruck, isPending } = useUpsertTruck({
    onSuccess: () => {
      onSuccess()
      if (!isEdit) form.reset()
    }
  })

  const form = useAppForm({
    defaultValues: {
      name: truck?.name,
      driver_id: truck?.driver_id,

      max_weight: truck?.max_weight,
      max_volume: truck?.max_volume,

      max_length: truck?.max_length,
      max_width: truck?.max_width,
      max_height: truck?.max_height
    },
    validators: {
      onSubmit: CreateTruckSchema
    },
    onSubmit: ({ value }) => {
      const payload = CreateTruckSchema.parse(value)
      handleUpsertTruck({ id: truck?.id, payload })
    }
  })

  const isPristine = useStore(form.store, ({ isPristine }) => isPristine)

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
            placeholder='102'
          />
        )}
      />

      <form.Field
        name='driver_id'
        children={(field) => {
          const invalid = field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={invalid}>
              <Label>Driver</Label>

              <TruckDriverSelect
                className='w-full'
                value={field.state.value}
                onChange={field.handleChange}
              />

              {invalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      />

      <div className='grid grid-cols-2 gap-4'>
        <form.AppField
          name='max_weight'
          children={(field) => (
            <field.NumberField
              label='Max Weight'
              addon='lbs'
            />
          )}
        />

        <form.AppField
          name='max_volume'
          children={(field) => (
            <field.NumberField
              label='Max Volume'
              addon='cu in'
            />
          )}
        />
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <form.AppField
          name='max_length'
          children={(field) => (
            <field.NumberField
              label='Max Length'
              addon='in'
            />
          )}
        />

        <form.AppField
          name='max_width'
          children={(field) => (
            <field.NumberField
              label='Max Width'
              addon='in'
            />
          )}
        />

        <form.AppField
          name='max_height'
          children={(field) => (
            <field.NumberField
              label='Max Height'
              addon='in'
            />
          )}
        />
      </div>

      <Button
        type='submit'
        className='w-24'
        isLoading={isPending}
        disabled={isPending || isPristine}
      >
        {isEdit ? 'Update' : 'Create'}
      </Button>
    </form>
  )
}

export const CreateTruckModal = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button>
          <RiAddCircleLine />
          <span>Create truck</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create truck</DialogTitle>
        </DialogHeader>

        <UpsertTruckForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

interface UpdateTruckModalProps extends ModalState {
  truck?: Truck
}

export const UpdateTruckModal = ({ truck, open, setOpen }: UpdateTruckModalProps) => (
  <Dialog
    open={open}
    onOpenChange={setOpen}
  >
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update truck</DialogTitle>
      </DialogHeader>
      <UpsertTruckForm
        truck={truck}
        onSuccess={() => setOpen(false)}
      />
    </DialogContent>
  </Dialog>
)
