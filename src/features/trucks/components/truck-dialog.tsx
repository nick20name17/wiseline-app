import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { truckPayloadSchema, useUpsertTruck, type Truck, type TruckPayload } from '../api'
import { DriverSelect } from './driver-select'

// The placeholders are a loaded 53' trailer, so the expected magnitude of each box is obvious.
const MEASUREMENTS = [
  { name: 'max_weight', label: 'Max Weight', unit: 'lbs', placeholder: '44000' },
  { name: 'max_volume', label: 'Max Volume', unit: 'cu in', placeholder: '3800' },
  { name: 'max_length', label: 'Max Length', unit: 'in', placeholder: '636' },
  { name: 'max_width', label: 'Max Width', unit: 'in', placeholder: '102' },
  { name: 'max_height', label: 'Max Height', unit: 'in', placeholder: '162' }
] as const satisfies readonly {
  name: keyof TruckPayload
  label: string
  unit: string
  placeholder: string
}[]

type TruckFormProps = {
  truck?: Truck
  onSuccess: () => void
}

const TruckForm = ({ truck, onSuccess }: TruckFormProps) => {
  const form = useForm<TruckPayload>({
    resolver: standardSchemaResolver(truckPayloadSchema),
    defaultValues: {
      name: truck?.name ?? '',
      driver_id: truck?.driver_id ?? null,
      max_weight: truck?.max_weight ?? null,
      max_volume: truck?.max_volume ?? null,
      max_length: truck?.max_length ?? null,
      max_width: truck?.max_width ?? null,
      max_height: truck?.max_height ?? null
    }
  })

  const mutation = useUpsertTruck(onSuccess)
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(payload => mutation.mutate({ id: truck?.id, payload }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor='truck-name'>Name</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='truck-name'
              placeholder='102'
              aria-invalid={errors.name ? true : undefined}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={errors.driver_id ? true : undefined}>
          <FieldLabel htmlFor='truck-driver'>Driver</FieldLabel>
          <Controller
            control={form.control}
            name='driver_id'
            render={({ field }) => (
              <DriverSelect
                id='truck-driver'
                value={field.value}
                onChange={field.onChange}
                invalid={errors.driver_id ? true : undefined}
              />
            )}
          />
          <FieldError errors={[errors.driver_id]} />
        </Field>

        <div className='grid grid-cols-2 gap-4'>
          {MEASUREMENTS.map(({ name, label, unit, placeholder }) => (
            <Field key={name} data-invalid={errors[name] ? true : undefined}>
              <FieldLabel htmlFor={`truck-${name}`}>{label}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id={`truck-${name}`}
                  type='number'
                  min={0}
                  inputMode='numeric'
                  placeholder={placeholder}
                  aria-invalid={errors[name] ? true : undefined}
                  // An empty measurement is genuinely unknown, so it goes back as null rather
                  // than a zero the floor would read as "this truck carries nothing". The guard
                  // covers the null default too, which Number() would otherwise turn into 0.
                  {...form.register(name, {
                    setValueAs: value =>
                      value === '' || value === null || value === undefined ? null : Number(value)
                  })}
                />
                <InputGroupAddon align='inline-end'>
                  <InputGroupText>{unit}</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldError errors={[errors[name]]} />
            </Field>
          ))}
        </div>

        <Button
          type='submit'
          className='mt-2 self-start'
          disabled={mutation.isPending || !form.formState.isDirty}
        >
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          {truck ? 'Update' : 'Create'}
        </Button>
      </FieldGroup>
    </form>
  )
}

export const CreateTruckDialog = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Create truck
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create truck</DialogTitle>
        </DialogHeader>
        {/* Remounts with the dialog so a cancelled draft is not there the next time it opens. */}
        {open && <TruckForm onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

type UpdateTruckDialogProps = {
  truck: Truck
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UpdateTruckDialog = ({ truck, open, onOpenChange }: UpdateTruckDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update truck</DialogTitle>
      </DialogHeader>
      {open && <TruckForm truck={truck} onSuccess={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>
)
