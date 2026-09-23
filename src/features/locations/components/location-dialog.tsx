import { RequiredLabel } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  allLocationTypesQuery,
  departmentsQuery,
  locationFormSchema,
  useUpsertLocation,
  warehousePickerQuery,
  type Department,
  type Location,
  type LocationForm as LocationFormValues
} from '../api'
import { WarehouseOptions } from './warehouse-options'

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

const DEFAULT_WEIGHT = 1000

// An empty number box means «not set», which the API stores as null rather than 0. The box starts
// out holding that null, so this has to read one as well as a string.
const asNumber = (value: string | number | null) => {
  const typed = `${value ?? ''}`.trim()
  return typed === '' ? null : Number(typed)
}

type LocationFormProps = {
  title: string
  location?: Location
  /** The department the page is showing: a new location takes only its types. */
  department?: Department
  onSuccess: () => void
}

const LocationForm = ({ title, location, department: scope, onSuccess }: LocationFormProps) => {
  // Both lists are already loaded — the dialog waits for them, because a form mounted before them
  // would default its pickers to nothing and post a location belonging nowhere.
  const { data: warehouses } = useQuery(warehousePickerQuery)
  const { data: types } = useQuery(allLocationTypesQuery)
  const { data: departments } = useQuery(departmentsQuery)

  const form = useForm<LocationFormValues>({
    resolver: standardSchemaResolver(locationFormSchema),
    defaultValues: {
      code: location?.code ?? '',
      warehouse_id: location?.warehouse_id ?? null,
      location_type_id: location?.location_type_id ?? null,
      // The design starts a new location at 1000 lb, the common rack.
      weight: location?.weight ?? DEFAULT_WEIGHT,
      description: location?.description ?? null,
      multi_order: location?.multi_order ?? false,
      max_orders: location?.max_orders ?? null
    }
  })

  const mutation = useUpsertLocation(onSuccess)
  const { errors } = form.formState
  const warehouseId = useWatch({ control: form.control, name: 'warehouse_id' })
  const multiOrder = useWatch({ control: form.control, name: 'multi_order' })
  const typeId = useWatch({ control: form.control, name: 'location_type_id' })
  // A location has no department of its own: it takes its type's, so the header follows the pick.
  const departmentId = types?.find(type => type.id === typeId)?.department_id
  const department = scope?.name ?? departments?.find(entry => entry.id === departmentId)?.name
  // A location takes a type from its own warehouse; anything else is refused, so the type waits
  // for the warehouse to be picked.
  const offered = types?.filter(
    type => type.warehouse_id === warehouseId && (!scope || type.department_id === scope.id)
  )

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: location?.id, values }))}
      noValidate
      className='flex flex-col gap-4'
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Department: {department ?? '—'}</DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Field data-invalid={invalid(errors.code)}>
          <RequiredLabel htmlFor='location-code'>Name</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='location-code'
              placeholder='e.g. 206'
              aria-required
              aria-invalid={invalid(errors.code)}
              {...form.register('code')}
            />
          </InputGroup>
          <FieldError errors={[errors.code]} />
        </Field>

        <Field data-invalid={invalid(errors.warehouse_id)}>
          <RequiredLabel htmlFor='location-warehouse'>Warehouse</RequiredLabel>
          <Controller
            control={form.control}
            name='warehouse_id'
            render={({ field }) => (
              <Select
                value={field.value === null ? null : String(field.value)}
                onValueChange={value => {
                  const next = value === null ? null : Number(value)
                  field.onChange(next)
                  // The type belongs to a warehouse, so one picked under another no longer fits.
                  const type = types?.find(entry => entry.id === form.getValues('location_type_id'))
                  if (type && type.warehouse_id !== next) form.setValue('location_type_id', null)
                }}
              >
                <SelectTrigger
                  id='location-warehouse'
                  aria-required
                  aria-invalid={invalid(errors.warehouse_id)}
                >
                  {/* The trigger holds the id; the name is what the eye is looking for. */}
                  <SelectValue placeholder='Select...'>
                    {(id: string | null) =>
                      warehouses?.find(warehouse => warehouse.id === Number(id))?.name ??
                      'Select...'
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

        <Field data-invalid={invalid(errors.location_type_id)}>
          <RequiredLabel htmlFor='location-type'>Location Type</RequiredLabel>
          <Controller
            control={form.control}
            name='location_type_id'
            render={({ field }) => (
              <Select
                value={field.value === null ? null : String(field.value)}
                onValueChange={value => field.onChange(value === null ? null : Number(value))}
                disabled={warehouseId === null}
              >
                <SelectTrigger
                  id='location-type'
                  aria-describedby={warehouseId === null ? 'location-type-hint' : undefined}
                  aria-required
                  aria-invalid={invalid(errors.location_type_id)}
                >
                  <SelectValue placeholder='Select...'>
                    {(id: string | null) =>
                      types?.find(type => type.id === Number(id))?.name ?? 'Select...'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {offered?.length ? (
                    offered.map(type => (
                      <SelectItem
                        key={type.id}
                        value={String(type.id)}
                        label={type.name ?? `Type ${type.id}`}
                      >
                        {/* The same two fields the Location Types list leads with. */}
                        <span className='flex min-w-0 flex-col'>
                          {type.name ?? `Type ${type.id}`}
                          <span className='truncate text-xs text-muted-foreground'>
                            {warehouses?.find(warehouse => warehouse.id === type.warehouse_id)
                              ?.name ?? '—'}
                          </span>
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    // An open list with nothing in it reads as broken; say why it is empty.
                    <p className='px-2 py-1.5 text-sm text-muted-foreground'>
                      No location types in this warehouse
                    </p>
                  )}
                </SelectContent>
              </Select>
            )}
          />
          {warehouseId === null ? (
            <FieldDescription id='location-type-hint'>Select a warehouse first</FieldDescription>
          ) : null}
          <FieldError errors={[errors.location_type_id]} />
        </Field>

        <Field data-invalid={invalid(errors.weight)}>
          <RequiredLabel htmlFor='location-weight'>Max weight (lb)</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='location-weight'
              type='number'
              min={0}
              inputMode='numeric'
              placeholder='e.g. 2000'
              aria-required
              aria-invalid={invalid(errors.weight)}
              {...form.register('weight', { setValueAs: asNumber })}
            />
          </InputGroup>
          <FieldError errors={[errors.weight]} />
        </Field>

        <Field orientation='horizontal'>
          <FieldLabel htmlFor='location-multi'>Multi-order location</FieldLabel>
          <Controller
            control={form.control}
            name='multi_order'
            render={({ field }) => (
              <Switch id='location-multi' checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Field>

        {multiOrder ? (
          <Field data-invalid={invalid(errors.max_orders)}>
            <RequiredLabel htmlFor='location-max-orders'>Number of orders</RequiredLabel>
            <InputGroup>
              <InputGroupInput
                id='location-max-orders'
                type='number'
                min={1}
                inputMode='numeric'
                placeholder='e.g. 12'
                aria-required
                aria-invalid={invalid(errors.max_orders)}
                {...form.register('max_orders', { setValueAs: asNumber })}
              />
            </InputGroup>
            <FieldError errors={[errors.max_orders]} />
          </Field>
        ) : null}

        <Field data-invalid={invalid(errors.description)}>
          <FieldLabel htmlFor='location-description'>Description</FieldLabel>
          <Textarea
            id='location-description'
            placeholder='e.g. Multi-order bay'
            rows={3}
            aria-invalid={invalid(errors.description)}
            {...form.register('description', { setValueAs: value => value || null })}
          />
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>

      <div className='mt-2 flex justify-end gap-2'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={mutation.isPending || !form.formState.isDirty}>
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          Save
        </Button>
      </div>
    </form>
  )
}

/** The pickers a location cannot be written without. */
const useReady = () => {
  const { data: warehouses } = useQuery(warehousePickerQuery)
  const { data: types } = useQuery(allLocationTypesQuery)
  return !!warehouses && !!types
}

// The dialog keeps its title while the pickers load, so it is never announced without a name.
const Loading = ({ title }: { title: string }) => (
  <>
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    <Spinner />
  </>
)

type CreateLocationDialogProps = { department: Department | undefined }

export const CreateLocationDialog = ({ department }: CreateLocationDialogProps) => {
  const [open, setOpen] = useState(false)
  const ready = useReady()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Add location
      </DialogTrigger>
      <DialogContent>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        {ready ? (
          <LocationForm
            title='Add location'
            department={department}
            onSuccess={() => setOpen(false)}
          />
        ) : (
          <Loading title='Add location' />
        )}
      </DialogContent>
    </Dialog>
  )
}

type UpdateLocationDialogProps = {
  location: Location
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UpdateLocationDialog = ({
  location,
  open,
  onOpenChange
}: UpdateLocationDialogProps) => {
  const ready = useReady()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {ready ? (
          <LocationForm
            title='Edit location'
            location={location}
            onSuccess={() => onOpenChange(false)}
          />
        ) : (
          <Loading title='Edit location' />
        )}
      </DialogContent>
    </Dialog>
  )
}
