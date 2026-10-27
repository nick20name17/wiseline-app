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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { formatLongDate } from '@/lib/days'
import { useState } from 'react'
import { WEEKDAYS, useSetCalendarDay, type CalendarDay } from '../api'
import { DayLoadWarning } from './day-load-warning'

type DayFormProps = {
  day: CalendarDay
  /** Whether the day's weekday is in the work week. */
  usual: boolean
  onDone: () => void
}

const DayForm = ({ day, usual, onDone }: DayFormProps) => {
  const savedName = day.holiday ?? day.working_day ?? ''
  const [worked, setWorked] = useState(day.is_work_day)
  const [name, setName] = useState(savedName)
  const mutation = useSetCalendarDay(onDone)

  const weekday = WEEKDAYS[day.weekday - 1]?.long ?? ''
  // Set as its weekday usually is, the day keeps no name: the server drops the holiday or working day.
  const exceptional = worked !== usual
  const stale = !exceptional && savedName !== ''
  const changed = worked !== day.is_work_day || (exceptional && name.trim() !== savedName) || stale

  return (
    <form
      onSubmit={event => {
        event.preventDefault()
        mutation.mutate({
          date: day.date,
          is_work_day: worked,
          ...(exceptional && name.trim() ? { name: name.trim() } : {})
        })
      }}
    >
      <FieldGroup>
        <Field orientation='horizontal'>
          <FieldLabel htmlFor='day-worked'>Work day</FieldLabel>
          <Switch id='day-worked' checked={worked} onCheckedChange={setWorked} />
        </Field>

        <Field data-disabled={!exceptional}>
          <FieldLabel htmlFor='day-name'>{worked ? 'Working day' : 'Holiday'} name</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='day-name'
              placeholder={worked ? 'Working day' : 'Closed'}
              maxLength={255}
              disabled={!exceptional}
              value={exceptional ? name : ''}
              onChange={event => setName(event.target.value)}
            />
          </InputGroup>
          <p className='text-xs text-muted-foreground'>
            {exceptional
              ? 'Optional. Shown on the calendar and the list.'
              : `${weekday}s are ${usual ? 'worked' : 'off'} already, so the day needs no name.`}
          </p>
        </Field>
      </FieldGroup>

      {day.is_work_day && !worked ? <DayLoadWarning date={day.date} /> : null}

      <DialogFooter bare className='mt-6'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={mutation.isPending || !changed}>
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}

type DayDialogProps = {
  /** The day being set; none closes the dialog. */
  day: CalendarDay | null
  workDays: number[]
  onClose: () => void
}

/** One day of the calendar worked or off, and what it is called when that is not its weekday's usual. */
export const DayDialog = ({ day: asked, workDays, onClose }: DayDialogProps) => {
  // The last day asked stays drawn while the dialog animates closed.
  const [day, setDay] = useState(asked)
  if (asked && asked !== day) setDay(asked)
  const usual = day ? workDays.includes(day.weekday) : true

  return (
    <Dialog open={asked !== null} onOpenChange={open => (open ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{day ? formatLongDate(day.date) : ''}</DialogTitle>
          <DialogDescription>
            {day?.holiday
              ? `Holiday: ${day.holiday}.`
              : day?.working_day
                ? `Working day: ${day.working_day}.`
                : usual
                  ? 'A work day, as its weekday is.'
                  : 'Off, as its weekday is.'}
          </DialogDescription>
        </DialogHeader>
        {/* Keyed by date, so a day opened after another starts from its own state. */}
        {day ? <DayForm key={day.date} day={day} usual={usual} onDone={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}
