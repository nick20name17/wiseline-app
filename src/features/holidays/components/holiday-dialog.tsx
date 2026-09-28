import { RequiredLabel } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, fromIsoDay, toIsoDay } from '@/lib/days'
import { invalid } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { holidayPayloadSchema, useUpsertHoliday, type Holiday, type HolidayPayload } from '../api'

const YEARS_AHEAD = 5

type HolidayFormProps = {
  holiday?: Holiday
  /** Where a new holiday's date starts, as `YYYY-MM-DD`. */
  initialDate: string
  /** Handed the saved date, so the page can show the year the holiday went into. */
  onSuccess: (date: string) => void
}

const HolidayForm = ({ holiday, initialDate, onSuccess }: HolidayFormProps) => {
  const form = useForm<HolidayPayload>({
    resolver: standardSchemaResolver(holidayPayloadSchema),
    defaultValues: { date: holiday?.date ?? initialDate, name: holiday?.name ?? '' }
  })

  // A date that already has a holiday comes back as a 409 whose reason the toast shows.
  const mutation = useUpsertHoliday(() => onSuccess(form.getValues('date')))
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(payload => mutation.mutate({ id: holiday?.id, payload }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.date)}>
          <RequiredLabel htmlFor='holiday-date'>Date</RequiredLabel>
          <Controller
            control={form.control}
            name='date'
            render={({ field }) => (
              <DatePicker
                id='holiday-date'
                // Holidays are entered ahead, a year or more out.
                endMonth={new Date(new Date().getFullYear() + YEARS_AHEAD, 11)}
                value={fromIsoDay(field.value)}
                onChange={date => field.onChange(toIsoDay(date))}
                format={date => formatDate(toIsoDay(date))}
              />
            )}
          />
          <FieldError errors={[errors.date]} />
        </Field>

        <Field data-invalid={invalid(errors.name)}>
          <RequiredLabel htmlFor='holiday-name'>Name</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='holiday-name'
              placeholder='e.g. Christmas Day'
              maxLength={255}
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
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

type CreateHolidayDialogProps = {
  initialDate: string
  onSaved: (date: string) => void
}

export const CreateHolidayDialog = ({ initialDate, onSaved }: CreateHolidayDialogProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Add holiday
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add holiday</DialogTitle>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        <HolidayForm
          initialDate={initialDate}
          onSuccess={date => {
            setOpen(false)
            onSaved(date)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

type UpdateHolidayDialogProps = {
  holiday: Holiday
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (date: string) => void
}

export const UpdateHolidayDialog = ({
  holiday,
  open,
  onOpenChange,
  onSaved
}: UpdateHolidayDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit holiday</DialogTitle>
      </DialogHeader>
      <HolidayForm
        holiday={holiday}
        initialDate={holiday.date}
        onSuccess={date => {
          onOpenChange(false)
          onSaved(date)
        }}
      />
    </DialogContent>
  </Dialog>
)
