import { RequiredLabel } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/dialog'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, fromIsoDay, toIsoDay } from '@/lib/days'
import { invalid } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  exceptionPayloadSchema,
  KIND_LABELS,
  useUpsertException,
  type DayException,
  type DayKind,
  type ExceptionPayload
} from '../api'
import { DayLoadWarning } from './day-load-warning'

const YEARS_AHEAD = 5

type ExceptionFormProps = {
  exception?: DayException
  /** Where a new day's date starts, as `YYYY-MM-DD`. */
  initialDate: string
  /** Handed the saved date, so the page can show the year the day went into. */
  onSuccess: (date: string) => void
}

const ExceptionForm = ({ exception, initialDate, onSuccess }: ExceptionFormProps) => {
  // A saved day stays the kind it is: turning a holiday into a working day is a toggle on the calendar.
  const [kind, setKind] = useState<DayKind>(exception?.kind ?? 'holiday')
  // Read once, as a render must not read the clock.
  const [thisYear] = useState(() => new Date().getFullYear())
  const form = useForm<ExceptionPayload>({
    resolver: standardSchemaResolver(exceptionPayloadSchema),
    defaultValues: { date: exception?.date ?? initialDate, name: exception?.name ?? '' }
  })

  // A date that already has one comes back as a 409 whose reason the toast shows.
  const mutation = useUpsertException(() => onSuccess(form.getValues('date')))
  const { errors } = form.formState
  const date = useWatch({ control: form.control, name: 'date' })

  return (
    <form
      onSubmit={form.handleSubmit(payload => mutation.mutate({ kind, id: exception?.id, payload }))}
      noValidate
    >
      <FieldGroup>
        {exception ? null : (
          <Field>
            <RequiredLabel htmlFor='exception-kind'>Kind</RequiredLabel>
            <Select value={kind} onValueChange={value => setKind(value as DayKind)}>
              <SelectTrigger id='exception-kind'>
                <SelectValue>{(value: DayKind) => KIND_LABELS[value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABELS) as DayKind[]).map(value => (
                  <SelectItem key={value} value={value}>
                    {KIND_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field data-invalid={invalid(errors.date)}>
          <RequiredLabel htmlFor='exception-date'>Date</RequiredLabel>
          <Controller
            control={form.control}
            name='date'
            render={({ field }) => (
              <DatePicker
                id='exception-date'
                // Holidays are entered ahead, a year or more out.
                endMonth={new Date(thisYear + YEARS_AHEAD, 11)}
                value={fromIsoDay(field.value)}
                onChange={date => field.onChange(toIsoDay(date))}
                format={date => formatDate(toIsoDay(date))}
              />
            )}
          />
          <FieldError errors={[errors.date]} />
        </Field>

        <Field data-invalid={invalid(errors.name)}>
          <RequiredLabel htmlFor='exception-name'>Name</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='exception-name'
              placeholder={kind === 'holiday' ? 'e.g. Christmas Day' : 'e.g. Saturday shift'}
              maxLength={255}
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>
      </FieldGroup>

      {kind === 'holiday' && date ? <DayLoadWarning date={date} /> : null}

      {/* A phone stacks the answers full width, Save on top, as the drawer's own footers do. */}
      <DialogFooter bare className='mt-6'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={mutation.isPending || !form.formState.isDirty}>
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}

type CreateExceptionDialogProps = {
  initialDate: string
  onSaved: (date: string) => void
}

export const CreateExceptionDialog = ({ initialDate, onSaved }: CreateExceptionDialogProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Add day
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add holiday or working day</DialogTitle>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        <ExceptionForm
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

type UpdateExceptionDialogProps = {
  exception: DayException
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (date: string) => void
}

export const UpdateExceptionDialog = ({
  exception,
  open,
  onOpenChange,
  onSaved
}: UpdateExceptionDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit {KIND_LABELS[exception.kind].toLowerCase()}</DialogTitle>
      </DialogHeader>
      <ExceptionForm
        exception={exception}
        initialDate={exception.date}
        onSuccess={date => {
          onOpenChange(false)
          onSaved(date)
        }}
      />
    </DialogContent>
  </Dialog>
)
