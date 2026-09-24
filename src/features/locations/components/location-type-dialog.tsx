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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { invalid } from '@/lib/form'
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
import { WarehouseOptions } from './warehouse-options'

type LocationTypeFormProps = {
  locationType?: LocationType
  /** The department the page is showing, which a new type starts in. */
  departmentId?: number
  onSuccess: () => void
}

const LocationTypeForm = ({ locationType, departmentId, onSuccess }: LocationTypeFormProps) => {
  const { data: departments } = useQuery(departmentsQuery)
  const { data: warehouses } = useQuery(warehousePickerQuery)

  const form = useForm<LocationTypeFormValues>({
    resolver: standardSchemaResolver(locationTypeFormSchema),
    defaultValues: {
      name: locationType?.name ?? '',
      warehouse_id: locationType?.warehouse_id ?? warehouses?.[0]?.id ?? 0,
      department_id: locationType?.department_id ?? departmentId ?? departments?.[0]?.id ?? 0,
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
          <RequiredLabel htmlFor='type-name'>Name</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='type-name'
              placeholder='e.g. Trim Rack'
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={invalid(errors.warehouse_id)}>
          <RequiredLabel htmlFor='type-warehouse'>Warehouse</RequiredLabel>
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
                      warehouses?.find(warehouse => warehouse.id === Number(id))?.name ?? 'Select…'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <WarehouseOptions warehouses={warehouses} />
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.warehouse_id]} />
        </Field>

        <Field data-invalid={invalid(errors.department_id)}>
          <RequiredLabel htmlFor='type-department'>Department</RequiredLabel>
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
                      'Select…'
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
            placeholder='e.g. Standing trim racks'
            aria-invalid={invalid(errors.description)}
            // An empty box means «no description», which the API stores as null rather than ''.
            {...form.register('description', { setValueAs: value => value || null })}
          />
          <FieldError errors={[errors.description]} />
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

/** The pickers a type cannot be written without. */
const useReady = () => {
  const { data: departments } = useQuery(departmentsQuery)
  const { data: warehouses } = useQuery(warehousePickerQuery)
  return !!departments && !!warehouses
}

type CreateLocationTypeDialogProps = { departmentId: number | undefined }

export const CreateLocationTypeDialog = ({ departmentId }: CreateLocationTypeDialogProps) => {
  const [open, setOpen] = useState(false)
  const ready = useReady()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Add location type
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add location type</DialogTitle>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        {ready ? (
          <LocationTypeForm departmentId={departmentId} onSuccess={() => setOpen(false)} />
        ) : (
          <Spinner />
        )}
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
          <DialogTitle>Edit location type</DialogTitle>
        </DialogHeader>
        {ready ? (
          <LocationTypeForm locationType={locationType} onSuccess={() => onOpenChange(false)} />
        ) : (
          <Spinner />
        )}
      </DialogContent>
    </Dialog>
  )
}
