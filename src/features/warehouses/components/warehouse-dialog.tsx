import { Button } from '@/components/ui/button'
import {
  Dialog,
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

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

type WarehouseFormProps = {
  warehouse?: Warehouse
  isDefault?: boolean
  onSuccess: () => void
}

const WarehouseForm = ({ warehouse, isDefault = false, onSuccess }: WarehouseFormProps) => {
  const form = useForm<WarehouseFormValues>({
    resolver: standardSchemaResolver(warehouseFormSchema),
    defaultValues: {
      name: warehouse?.name ?? '',
      address: warehouse?.address ?? '',
      description: warehouse?.description ?? null,
      is_default: isDefault
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
          <FieldLabel htmlFor='warehouse-name'>Name</FieldLabel>
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
              <Switch
                id='warehouse-default'
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        <Button
          type='submit'
          className='mt-2 self-start'
          disabled={mutation.isPending || !form.formState.isDirty}
        >
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          {warehouse ? 'Update' : 'Create'}
        </Button>
      </FieldGroup>
    </form>
  )
}

export const CreateWarehouseDialog = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Create warehouse
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create warehouse</DialogTitle>
        </DialogHeader>
        {/* Remounts with the dialog so a cancelled draft is not there the next time it opens. */}
        {open && <WarehouseForm onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

type UpdateWarehouseDialogProps = {
  warehouse: Warehouse
  isDefault: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UpdateWarehouseDialog = ({
  warehouse,
  isDefault,
  open,
  onOpenChange
}: UpdateWarehouseDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update warehouse</DialogTitle>
      </DialogHeader>
      {open && (
        <WarehouseForm
          warehouse={warehouse}
          isDefault={isDefault}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </DialogContent>
  </Dialog>
)
