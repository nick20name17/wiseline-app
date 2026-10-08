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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { asNumber, invalid } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useQuery } from '@tanstack/react-query'
import { Gauge } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  capacitiesQuery,
  dailyCapacityFormSchema,
  useSaveDailyCapacity,
  type DailyCapacityForm as DailyCapacityFormValues,
  type Department,
  type DepartmentCapacity
} from '../api'

type DailyCapacityFormProps = {
  department: Department
  capacity: DepartmentCapacity | undefined
  onSuccess: () => void
}

const DailyCapacityForm = ({ department, capacity, onSuccess }: DailyCapacityFormProps) => {
  const form = useForm<DailyCapacityFormValues>({
    resolver: standardSchemaResolver(dailyCapacityFormSchema),
    defaultValues: { per_day: capacity?.per_day ?? null }
  })

  const mutation = useSaveDailyCapacity(onSuccess)
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ department, capacity, values }))}
      noValidate
    >
      <Field data-invalid={invalid(errors.per_day)}>
        <FieldLabel htmlFor='daily-capacity'>Pieces a day</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id='daily-capacity'
            type='number'
            min={1}
            inputMode='numeric'
            placeholder='e.g. 300'
            aria-invalid={invalid(errors.per_day)}
            {...form.register('per_day', { setValueAs: asNumber })}
          />
          <InputGroupAddon align='inline-end'>
            <InputGroupText>pcs</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldError errors={[errors.per_day]} />
      </Field>

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

type DailyCapacityDialogProps = { department: Department }

/**
 * The most the department takes on in a day, in pieces: its day tabs show what is scheduled against
 * it and turn red past it p3 (1078,280). Accessories has no machines to add it up from.
 */
export const DailyCapacityDialog = ({ department }: DailyCapacityDialogProps) => {
  const [open, setOpen] = useState(false)
  const { data: capacities, isPending } = useQuery(capacitiesQuery)
  const capacity = capacities?.find(row => row.department === department.id)
  const perDay = capacity?.per_day ?? null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant='outline' disabled={isPending} />}>
        <Gauge data-icon='inline-start' />
        Daily capacity · {perDay === null ? 'not set' : `${perDay} pcs`}
      </DialogTrigger>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Daily capacity · {department.name}</DialogTitle>
          <DialogDescription>
            Each day tab shows the pieces scheduled against this, and turns red past it.
          </DialogDescription>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        <DailyCapacityForm
          department={department}
          capacity={capacity}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
