import { RequiredLabel } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { formatLongDate } from '@/lib/days'
import { asAmount, asNumber, DECIMAL_INPUT, invalid } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  pickupPayloadSchema,
  useCreatePickup,
  useUpdatePickup,
  type Assignment,
  type PickupPayload,
  type TruckCard
} from '../api'

type PickupFormProps = {
  defaultValues: PickupPayload
  submitLabel: string
  isPending: boolean
  /** `changed` names the fields the user touched. */
  onSubmit: (payload: PickupPayload, changed: (keyof PickupPayload)[]) => void
}

const PickupForm = ({ defaultValues, submitLabel, isPending, onSubmit }: PickupFormProps) => {
  const form = useForm<PickupPayload>({
    resolver: standardSchemaResolver(pickupPayloadSchema),
    defaultValues
  })
  const { errors, dirtyFields } = form.formState

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(payload =>
        onSubmit(payload, Object.keys(dirtyFields) as (keyof PickupPayload)[])
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
                {...DECIMAL_INPUT}
                aria-invalid={invalid(errors.weight)}
                {...form.register('weight', { setValueAs: asAmount })}
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
                {...DECIMAL_INPUT}
                aria-invalid={invalid(errors.length)}
                {...form.register('length', { setValueAs: asNumber })}
              />
            </InputGroup>
            <FieldError errors={[errors.length]} />
          </Field>
        </div>
      </FieldGroup>

      <DialogFooter bare className='mt-6'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={isPending}>
          {isPending ? <Spinner data-icon='inline-start' /> : null}
          {submitLabel}
        </Button>
      </DialogFooter>
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
  const create = useCreatePickup()

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
        <PickupForm
          defaultValues={{ supplier: '', description: '', weight: null, length: null }}
          submitLabel='Add pickup'
          isPending={create.isPending}
          onSubmit={payload =>
            create.mutate(
              { ...payload, shipDate, truckId: card.truck_id },
              { onSuccess: () => setOpen(false) }
            )
          }
        />
      </DialogContent>
    </Dialog>
  )
}

type EditPickupDialogProps = {
  pickup: Assignment
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** A pickup typed wrong, corrected before its Load is released. */
export const EditPickupDialog = ({ pickup, open, onOpenChange }: EditPickupDialogProps) => {
  const update = useUpdatePickup()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit pickup</DialogTitle>
          <DialogDescription>{pickup.customer}</DialogDescription>
        </DialogHeader>
        <PickupForm
          // The server puts the supplier in `customer`.
          defaultValues={{
            supplier: pickup.customer ?? '',
            description: pickup.description ?? '',
            weight: pickup.weight || null,
            length: pickup.length
          }}
          submitLabel='Save'
          isPending={update.isPending}
          onSubmit={(payload, changed) => {
            if (!changed.length) return onOpenChange(false)
            update.mutate(
              {
                id: pickup.assignment_id,
                ...Object.fromEntries(changed.map(key => [key, payload[key]]))
              },
              { onSuccess: () => onOpenChange(false) }
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
