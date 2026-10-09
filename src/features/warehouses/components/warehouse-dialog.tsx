import { RequiredLabel } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { invalid } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  useUpsertWarehouse,
  warehouseFormSchema,
  type Warehouse,
  type WarehouseForm as WarehouseFormValues
} from '../api'

type WarehouseFormProps = {
  warehouse?: Warehouse
  onSuccess: () => void
}

const WarehouseForm = ({ warehouse, onSuccess }: WarehouseFormProps) => {
  const form = useForm<WarehouseFormValues>({
    resolver: standardSchemaResolver(warehouseFormSchema),
    defaultValues: {
      name: warehouse?.name ?? '',
      address: warehouse?.address ?? '',
      description: warehouse?.description ?? null,
      is_default: warehouse?.is_default ?? false
    }
  })

  const mutation = useUpsertWarehouse(onSuccess)
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: warehouse?.id, values }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.name)}>
          <RequiredLabel htmlFor='warehouse-name'>Name</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='warehouse-name'
              placeholder='e.g. Tillsonburg'
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={invalid(errors.address)}>
          <FieldLabel htmlFor='warehouse-address'>Address</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='warehouse-address'
              placeholder='e.g. 21 Clearview Dr'
              aria-invalid={invalid(errors.address)}
              {...form.register('address')}
            />
          </InputGroup>
          <FieldError errors={[errors.address]} />
        </Field>

        <Field data-invalid={invalid(errors.description)}>
          <FieldLabel htmlFor='warehouse-description'>Description</FieldLabel>
          <Textarea
            id='warehouse-description'
            rows={3}
            placeholder='e.g. Main plant'
            aria-invalid={invalid(errors.description)}
            // An empty box means "no description", which the API stores as null rather than ''.
            {...form.register('description', { setValueAs: value => value || null })}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field orientation='horizontal'>
          <FieldLabel htmlFor='warehouse-default'>Default warehouse</FieldLabel>
          <Controller
            control={form.control}
            name='is_default'
            render={({ field }) => (
              // The server refuses to unmark the default: another one has to take its place.
              <Switch
                id='warehouse-default'
                checked={field.value}
                disabled={warehouse?.is_default}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>
      </FieldGroup>

      <div className='mt-6 flex justify-end gap-2'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={mutation.isPending || !form.formState.isDirty}>
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          Save
        </Button>
      </div>
    </form>
  )
}

export const CreateWarehouseDialog = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Add warehouse
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add warehouse</DialogTitle>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        <WarehouseForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

type UpdateWarehouseDialogProps = {
  warehouse: Warehouse
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UpdateWarehouseDialog = ({
  warehouse,
  open,
  onOpenChange
}: UpdateWarehouseDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit warehouse</DialogTitle>
      </DialogHeader>
      <WarehouseForm warehouse={warehouse} onSuccess={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
)
