import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { RequiredLabel } from '@/components/required-label'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { asAmount, DECIMAL_INPUT, invalid } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useForm } from 'react-hook-form'
import {
  gaugeWeightFormSchema,
  useSaveGaugeWeight,
  type GaugeRow,
  type GaugeWeightForm
} from '../api'

type GaugeWeightFormProps = { row: GaugeRow; onSuccess: () => void }

const GaugeWeightFields = ({ row, onSuccess }: GaugeWeightFormProps) => {
  const form = useForm<GaugeWeightForm>({
    resolver: standardSchemaResolver(gaugeWeightFormSchema),
    defaultValues: { weight: row.weight ?? undefined, description: row.description }
  })
  const save = useSaveGaugeWeight(onSuccess)
  const { errors } = form.formState

  return (
    <form onSubmit={form.handleSubmit(values => save.mutate({ row, values }))} noValidate>
      <FieldGroup>
        <Field data-invalid={invalid(errors.weight)}>
          <RequiredLabel htmlFor='gauge-weight'>Weight</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='gauge-weight'
              {...DECIMAL_INPUT}
              placeholder='e.g. 1.25'
              aria-invalid={invalid(errors.weight)}
              {...form.register('weight', { setValueAs: asAmount })}
            />
            <InputGroupAddon align='inline-end'>lb / sq ft</InputGroupAddon>
          </InputGroup>
          <FieldError errors={[errors.weight]} />
        </Field>
        <Field data-invalid={invalid(errors.description)}>
          <FieldLabel htmlFor='gauge-description'>Description</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='gauge-description'
              placeholder='e.g. painted, both sides'
              aria-invalid={invalid(errors.description)}
              {...form.register('description', { setValueAs: value => value?.trim() || null })}
            />
          </InputGroup>
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>

      <DialogFooter bare className='mt-6'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={save.isPending || !form.formState.isDirty}>
          {save.isPending ? <Spinner data-icon='inline-start' /> : null}
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}

type GaugeWeightDialogProps = {
  row: GaugeRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const GaugeWeightDialog = ({ row, open, onOpenChange }: GaugeWeightDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{row.gauge} ga weight</DialogTitle>
        <DialogDescription>
          Per square foot, paint included. A coil weighs this × its width × its linear feet.
        </DialogDescription>
      </DialogHeader>
      <GaugeWeightFields row={row} onSuccess={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
)
