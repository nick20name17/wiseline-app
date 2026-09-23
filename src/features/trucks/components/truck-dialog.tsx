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
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { truckPayloadSchema, useUpsertTruck, type Truck, type TruckPayload } from '../api'

type TruckFormProps = {
  truck?: Truck
  onSuccess: () => void
}

const TruckForm = ({ truck, onSuccess }: TruckFormProps) => {
  const form = useForm<TruckPayload>({
    resolver: standardSchemaResolver(truckPayloadSchema),
    defaultValues: {
      name: truck?.name ?? '',
      plate: truck?.plate ?? null,
      max_weight: truck?.max_weight ?? null
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
          <RequiredLabel htmlFor='truck-name'>Name</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='truck-name'
              placeholder='e.g. Unit 12'
              aria-invalid={errors.name ? true : undefined}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={errors.plate ? true : undefined}>
          <FieldLabel htmlFor='truck-plate'>Plate</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='truck-plate'
              placeholder='e.g. AK-2231'
              maxLength={32}
              aria-invalid={errors.plate ? true : undefined}
              {...form.register('plate', { setValueAs: value => value?.trim() || null })}
            />
          </InputGroup>
          <FieldError errors={[errors.plate]} />
        </Field>

        <Field data-invalid={errors.max_weight ? true : undefined}>
          <FieldLabel htmlFor='truck-max-weight'>Max weight (lb)</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='truck-max-weight'
              type='number'
              min={0}
              inputMode='numeric'
              placeholder='e.g. 18000'
              aria-invalid={errors.max_weight ? true : undefined}
              // An empty weight is genuinely unknown, so it goes back as null rather than a zero
              // the floor would read as "this truck carries nothing". The guard covers the null
              // default too, which Number() would otherwise turn into 0.
              {...form.register('max_weight', {
                setValueAs: value =>
                  value === '' || value === null || value === undefined ? null : Number(value)
              })}
            />
          </InputGroup>
          <FieldError errors={[errors.max_weight]} />
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

export const CreateTruckDialog = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Add truck
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add truck</DialogTitle>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        <TruckForm onSuccess={() => setOpen(false)} />
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
        <DialogTitle>Edit truck</DialogTitle>
      </DialogHeader>
      <TruckForm truck={truck} onSuccess={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
)
