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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  allLocationTypesQuery,
  locationFormSchema,
  useUpsertLocation,
  warehousePickerQuery,
  type Location,
  type LocationForm as LocationFormValues
} from '../api'

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

// An empty number box means «not set», which the API stores as null rather than 0. The box starts
// out holding that null, so this has to read one as well as a string.
const asNumber = (value: string | number | null) => {
  const typed = `${value ?? ''}`.trim()
  return typed === '' ? null : Number(typed)
}

type LocationFormProps = {
  location?: Location
  onSuccess: () => void
}

const LocationForm = ({ location, onSuccess }: LocationFormProps) => {
  // Both lists are already loaded — the dialog waits for them, because a form mounted before them
  // would default its pickers to nothing and post a location belonging nowhere.
  const { data: warehouses } = useQuery(warehousePickerQuery)
  const { data: types } = useQuery(allLocationTypesQuery)

  const form = useForm<LocationFormValues>({
    resolver: standardSchemaResolver(locationFormSchema),
    defaultValues: {
      code: location?.code ?? '',
      warehouse_id: location?.warehouse_id ?? warehouses?.[0]?.id ?? 0,
      location_type_id: location?.location_type_id ?? types?.[0]?.id ?? 0,
      weight: location?.weight ?? null,
      dimensions: location?.dimensions ?? null,
      description: location?.description ?? null,
      multi_order: location?.multi_order ?? false,
      max_orders: location?.max_orders ?? null
    }
  })

  const mutation = useUpsertLocation(onSuccess)
  const { errors } = form.formState
  const warehouseId = useWatch({ control: form.control, name: 'warehouse_id' })
  const multiOrder = useWatch({ control: form.control, name: 'multi_order' })
  // A location takes a type from its own warehouse; anything else is refused.
  const offered = types?.filter(type => type.warehouse_id === warehouseId)

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: location?.id, values }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.code)}>
          <FieldLabel htmlFor='location-code'>Name</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='location-code'
              placeholder='e.g. 101'
              aria-invalid={invalid(errors.code)}
              {...form.register('code')}
            />
          </InputGroup>
          <FieldError errors={[errors.code]} />
        </Field>

        <Field data-invalid={invalid(errors.warehouse_id)}>
          <FieldLabel htmlFor='location-warehouse'>Warehouse</FieldLabel>
          <Controller
            control={form.control}
            name='warehouse_id'
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={value => field.onChange(Number(value))}
              >
                <SelectTrigger id='location-warehouse'>
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

        <Field data-invalid={invalid(errors.location_type_id)}>
          <FieldLabel htmlFor='location-type'>Location type</FieldLabel>
          <Controller
            control={form.control}
            name='location_type_id'
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={value => field.onChange(Number(value))}
              >
                <SelectTrigger id='location-type'>
                  <SelectValue>
                    {(id: string) =>
                      types?.find(type => type.id === Number(id))?.name ?? 'Pick a type'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {offered?.map(type => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name ?? `Type ${type.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.location_type_id]} />
        </Field>

        <Field data-invalid={invalid(errors.weight)}>
          <FieldLabel htmlFor='location-weight'>Max weight (lbs.)</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='location-weight'
              type='number'
              min={0}
              inputMode='numeric'
              placeholder='e.g. 500'
              aria-invalid={invalid(errors.weight)}
              {...form.register('weight', { setValueAs: asNumber })}
            />
          </InputGroup>
          <FieldError errors={[errors.weight]} />
        </Field>

        <Field data-invalid={invalid(errors.dimensions)}>
          <FieldLabel htmlFor='location-dimensions'>Dimensions</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='location-dimensions'
              placeholder='e.g. 8 × 4 ft'
              aria-invalid={invalid(errors.dimensions)}
              {...form.register('dimensions', { setValueAs: value => value || null })}
            />
          </InputGroup>
          <FieldError errors={[errors.dimensions]} />
        </Field>

        <Field orientation='horizontal'>
          <FieldLabel htmlFor='location-multi'>Takes more than one order</FieldLabel>
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
            <FieldLabel htmlFor='location-max-orders'>How many orders</FieldLabel>
            {/* Left empty it takes any number of them, which is what the board's blank means. */}
            <InputGroup>
              <InputGroupInput
                id='location-max-orders'
                type='number'
                min={1}
                inputMode='numeric'
                placeholder='Any'
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
            rows={3}
            aria-invalid={invalid(errors.description)}
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
          {location ? 'Update' : 'Create'}
        </Button>
      </FieldGroup>
    </form>
  )
}

/** The pickers a location cannot be written without. */
const useReady = () => {
  const { data: warehouses } = useQuery(warehousePickerQuery)
  const { data: types } = useQuery(allLocationTypesQuery)
  return !!warehouses && !!types
}

export const CreateLocationDialog = () => {
  const [open, setOpen] = useState(false)
  const ready = useReady()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Create location
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create location</DialogTitle>
        </DialogHeader>
        {/* Remounts with the dialog so a cancelled draft is not there the next time it opens. */}
        {open && ready ? <LocationForm onSuccess={() => setOpen(false)} /> : <Spinner />}
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
        <DialogHeader>
          <DialogTitle>Update location</DialogTitle>
        </DialogHeader>
        {open && ready ? (
          <LocationForm location={location} onSuccess={() => onOpenChange(false)} />
        ) : (
          <Spinner />
        )}
      </DialogContent>
    </Dialog>
  )
}
