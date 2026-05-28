import { RiAddCircleLine } from '@remixicon/react'
import { useStore } from '@tanstack/react-form'
import { useState } from 'react'

import { WarehousesSelect } from '../selects/warehouse'

import { useUpsertLocation } from '@/api/locations/query'
import { CreateLocationsSchema, type Location } from '@/api/locations/schema'
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

interface UpsertLocationFormProps {
  onSuccess: () => void
  location?: Location
}

const UpsertLocationForm = ({ location, onSuccess }: UpsertLocationFormProps) => {
  const isEdit = !!location

  const { handleUpsertLocation, isPending } = useUpsertLocation({
    onSuccess: () => {
      onSuccess()
      if (!isEdit) form.reset()
    }
  })

  const form = useAppForm({
    defaultValues: {
      code: location?.code ?? '',
      position: location?.position ?? undefined,
      warehouse_id: location?.warehouse_id ?? location?.warehouse?.id,
      weight: location?.weight ?? undefined
    },
    validators: {
      onSubmit: CreateLocationsSchema
    },
    onSubmit: async ({ value }) => {
      const payload = CreateLocationsSchema.parse(value)

      handleUpsertLocation({ id: location?.id, payload })
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

      <form.AppField
        name='weight'
        children={(field) => <field.NumberField label='Max Weight' />}
      />

      <form.Field
        name='warehouse_id'
        children={(field) => {
          const invalid = field.state.meta.isTouched && !field.state.meta.isValid

          return (
            <Field data-invalid={invalid}>
              <Label>Warehouse</Label>

              <WarehousesSelect
                className='w-full'
                value={field.state.value}
                onChange={(value) => field.handleChange(value ?? -1)}
              />

              {invalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      />

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

export const CreateLocationModal = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button>
          <RiAddCircleLine />
          <span>Create location</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create location</DialogTitle>
        </DialogHeader>
        <UpsertLocationForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------
// Update Modal
// -------------------------------------------------------------
interface UpdateLocationModalProps extends ModalState {
  location?: Location
}

export const UpdateLocationModal = ({ location, open, setOpen }: UpdateLocationModalProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update location</DialogTitle>
        </DialogHeader>
        <UpsertLocationForm
          location={location}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
