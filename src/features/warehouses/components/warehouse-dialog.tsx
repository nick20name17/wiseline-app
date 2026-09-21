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
import { Textarea } from '@/components/ui/textarea'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  useUpsertWarehouse,
  warehousePayloadSchema,
  type Warehouse,
  type WarehousePayload
} from '../api'

type WarehouseFormProps = {
  warehouse?: Warehouse
  onSuccess: () => void
}

const WarehouseForm = ({ warehouse, onSuccess }: WarehouseFormProps) => {
  const form = useForm<WarehousePayload>({
    resolver: standardSchemaResolver(warehousePayloadSchema),
    defaultValues: {
      name: warehouse?.name ?? '',
      address: warehouse?.address ?? '',
      description: warehouse?.description ?? null
    }
  })

  const mutation = useUpsertWarehouse(onSuccess)
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(payload => mutation.mutate({ id: warehouse?.id, payload }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor='warehouse-name'>Name</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='warehouse-name'
              placeholder='Warehouse #1'
              aria-invalid={errors.name ? true : undefined}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={errors.address ? true : undefined}>
          <FieldLabel htmlFor='warehouse-address'>Address</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='warehouse-address'
              placeholder='20 Clearview Dr. Tillsonburg'
              aria-invalid={errors.address ? true : undefined}
              {...form.register('address')}
            />
          </InputGroup>
          <FieldError errors={[errors.address]} />
        </Field>

        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor='warehouse-description'>Description</FieldLabel>
          <Textarea
            id='warehouse-description'
            rows={3}
            placeholder='Primary warehouse in the production plant'
            aria-invalid={errors.description ? true : undefined}
            // An empty box means "no description", which the API stores as null rather than ''.
            {...form.register('description', { setValueAs: value => value || null })}
          />
          <FieldError errors={[errors.description]} />
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
        <DialogTitle>Update warehouse</DialogTitle>
      </DialogHeader>
      {open && <WarehouseForm warehouse={warehouse} onSuccess={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>
)
