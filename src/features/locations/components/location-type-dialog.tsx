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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  departmentsQuery,
  locationTypeFormSchema,
  useUpsertLocationType,
  warehousePickerQuery,
  type LocationType,
  type LocationTypeForm as LocationTypeFormValues
} from '../api'

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

type LocationTypeFormProps = {
  locationType?: LocationType
  onSuccess: () => void
}

const LocationTypeForm = ({ locationType, onSuccess }: LocationTypeFormProps) => {
  const { data: departments } = useQuery(departmentsQuery)
  const { data: warehouses } = useQuery(warehousePickerQuery)

  const form = useForm<LocationTypeFormValues>({
    resolver: standardSchemaResolver(locationTypeFormSchema),
    defaultValues: {
      name: locationType?.name ?? '',
      warehouse_id: locationType?.warehouse_id ?? warehouses?.[0]?.id ?? 0,
      department_id: locationType?.department_id ?? departments?.[0]?.id ?? 0,
      description: locationType?.description ?? null
    }
  })

  const mutation = useUpsertLocationType(onSuccess)
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: locationType?.id, values }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.name)}>
          <FieldLabel htmlFor='type-name'>Name</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='type-name'
              placeholder='e.g. Trim racks'
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={invalid(errors.warehouse_id)}>
          <FieldLabel htmlFor='type-warehouse'>Warehouse</FieldLabel>
          <Controller
            control={form.control}
            name='warehouse_id'
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={value => field.onChange(Number(value))}
              >
                <SelectTrigger id='type-warehouse'>
                  {/* The trigger holds the id; the name is what the eye is looking for. */}
                  <SelectValue>
                    {(id: string) =>
                      warehouses?.find(warehouse => warehouse.id === Number(id))?.name ??
                      'Pick a warehouse'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map(warehouse => (
                    <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                      {warehouse.name ?? `Warehouse ${warehouse.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.warehouse_id]} />
        </Field>

        <Field data-invalid={invalid(errors.department_id)}>
          <FieldLabel htmlFor='type-department'>Department</FieldLabel>
          {/* A location has no department of its own — it takes this one. */}
          <Controller
            control={form.control}
            name='department_id'
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={value => field.onChange(Number(value))}
              >
                <SelectTrigger id='type-department'>
                  <SelectValue>
                    {(id: string) =>
                      departments?.find(department => department.id === Number(id))?.name ??
                      'Pick a department'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments?.map(department => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.department_id]} />
        </Field>

        <Field data-invalid={invalid(errors.description)}>
          <FieldLabel htmlFor='type-description'>Description</FieldLabel>
          <Textarea
            id='type-description'
            rows={3}
            placeholder='e.g. Racks along the north wall'
            aria-invalid={invalid(errors.description)}
            // An empty box means «no description», which the API stores as null rather than ''.
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
          {locationType ? 'Update' : 'Create'}
        </Button>
      </FieldGroup>
    </form>
  )
}

/** The pickers a type cannot be written without. */
const useReady = () => {
  const { data: departments } = useQuery(departmentsQuery)
  const { data: warehouses } = useQuery(warehousePickerQuery)
  return !!departments && !!warehouses
}

export const CreateLocationTypeDialog = () => {
  const [open, setOpen] = useState(false)
  const ready = useReady()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Create location type
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create location type</DialogTitle>
        </DialogHeader>
        {/* Remounts with the dialog so a cancelled draft is not there the next time it opens. */}
        {open && ready ? <LocationTypeForm onSuccess={() => setOpen(false)} /> : <Spinner />}
      </DialogContent>
    </Dialog>
  )
}

type UpdateLocationTypeDialogProps = {
  locationType: LocationType
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UpdateLocationTypeDialog = ({
  locationType,
  open,
  onOpenChange
}: UpdateLocationTypeDialogProps) => {
  const ready = useReady()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update location type</DialogTitle>
        </DialogHeader>
        {open && ready ? (
          <LocationTypeForm locationType={locationType} onSuccess={() => onOpenChange(false)} />
        ) : (
          <Spinner />
        )}
      </DialogContent>
    </Dialog>
  )
}
