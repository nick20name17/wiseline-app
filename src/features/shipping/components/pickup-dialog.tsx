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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { formatLongDate } from '@/lib/days'
import { asNumber, invalid } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { pickupPayloadSchema, useCreatePickup, type PickupPayload, type TruckCard } from '../api'

type PickupFormProps = { card: TruckCard; shipDate: string; onDone: () => void }

const PickupForm = ({ card, shipDate, onDone }: PickupFormProps) => {
  const form = useForm<PickupPayload>({
    resolver: standardSchemaResolver(pickupPayloadSchema),
    defaultValues: { supplier: '', description: '', weight: null, length: null }
  })
  const create = useCreatePickup()
  const { errors } = form.formState

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(payload =>
        create.mutate({ ...payload, shipDate, truckId: card.truck_id }, { onSuccess: onDone })
      )}
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.supplier)}>
          <RequiredLabel htmlFor='pickup-supplier'>Supplier</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='pickup-supplier'
              placeholder='e.g. Coloured Steel'
              maxLength={255}
              aria-invalid={invalid(errors.supplier)}
              {...form.register('supplier')}
            />
          </InputGroup>
          <FieldError errors={[errors.supplier]} />
        </Field>

        <Field data-invalid={invalid(errors.description)}>
          <FieldLabel htmlFor='pickup-description'>What to pick up</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='pickup-description'
              placeholder='e.g. 2 bundles of J-channel'
              maxLength={255}
              aria-invalid={invalid(errors.description)}
              {...form.register('description')}
            />
          </InputGroup>
          <FieldError errors={[errors.description]} />
        </Field>

        <div className='grid gap-4 sm:grid-cols-2'>
          <Field data-invalid={invalid(errors.weight)}>
            <FieldLabel htmlFor='pickup-weight'>Weight (lbs)</FieldLabel>
            {/* The truck's weight tiles add it in p3 (617,311). */}
            <InputGroup>
              <InputGroupInput
                id='pickup-weight'
                placeholder='e.g. 450'
                type='number'
                min={0}
                step='any'
                inputMode='decimal'
                aria-invalid={invalid(errors.weight)}
                {...form.register('weight', { setValueAs: asNumber })}
              />
            </InputGroup>
            <FieldError errors={[errors.weight]} />
          </Field>

          <Field data-invalid={invalid(errors.length)}>
            <FieldLabel htmlFor='pickup-length'>Longest length (in)</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id='pickup-length'
                placeholder='e.g. 240'
                type='number'
                min={0}
                step='any'
                inputMode='decimal'
                aria-invalid={invalid(errors.length)}
                {...form.register('length', { setValueAs: asNumber })}
              />
            </InputGroup>
            <FieldError errors={[errors.length]} />
          </Field>
        </div>
      </FieldGroup>

      <div className='mt-6 flex justify-end gap-2'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={create.isPending}>
          {create.isPending ? <Spinner data-icon='inline-start' /> : null}
          Add pickup
        </Button>
      </div>
    </form>
  )
}

type PickupDialogProps = { card: TruckCard; shipDate: string }

/**
 * A supplier pickup onto this truck for the day — «things that a delivery driver needs to pickup for a
 * supplier», not a customer's pickup p3 (586,248). It then goes on a Load like any order.
 */
export const PickupDialog = ({ card, shipDate }: PickupDialogProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant='outline' />}>
        <PackagePlus data-icon='inline-start' />
        Supplier pickup
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supplier pickup</DialogTitle>
          <DialogDescription>
            Truck {card.name} · {formatLongDate(shipDate)}
          </DialogDescription>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time. */}
        <PickupForm card={card} shipDate={shipDate} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
