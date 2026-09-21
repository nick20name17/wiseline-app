import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
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

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

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
      description: warehouse?.description ?? null,
      code: warehouse?.code ?? null,
      position: warehouse?.position || 1
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
        <Field data-invalid={invalid(errors.name)}>
          <FieldLabel htmlFor='warehouse-name'>Name</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='warehouse-name'
              placeholder='Warehouse #1'
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <div className='grid grid-cols-2 gap-4'>
          <Field data-invalid={invalid(errors.code)}>
            <FieldLabel htmlFor='warehouse-code'>Code</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id='warehouse-code'
                placeholder='WH1'
                aria-invalid={invalid(errors.code)}
                // An empty code is no code, which the API stores as null rather than ''.
                {...form.register('code', { setValueAs: value => value || null })}
              />
            </InputGroup>
            <FieldError errors={[errors.code]} />
          </Field>

          <Field data-invalid={invalid(errors.position)}>
            <FieldLabel htmlFor='warehouse-position'>Position</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id='warehouse-position'
                type='number'
                min={1}
                inputMode='numeric'
                placeholder='1'
                aria-invalid={invalid(errors.position)}
                {...form.register('position', { setValueAs: value => Number(value) })}
              />
            </InputGroup>
            <FieldDescription>The lowest one is the default warehouse.</FieldDescription>
            <FieldError errors={[errors.position]} />
          </Field>
        </div>

        <Field data-invalid={invalid(errors.address)}>
          <FieldLabel htmlFor='warehouse-address'>Address</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='warehouse-address'
              placeholder='20 Clearview Dr. Tillsonburg'
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
            placeholder='Primary warehouse in the production plant'
            aria-invalid={invalid(errors.description)}
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
