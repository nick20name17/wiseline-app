import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  departmentsQuery,
  priorityFormSchema,
  useUpsertPriority,
  type Priority,
  type PriorityForm as PriorityFormValues
} from '../api'

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

type PriorityFormProps = {
  priority?: Priority
  onSuccess: () => void
}

const PriorityForm = ({ priority, onSuccess }: PriorityFormProps) => {
  const { data: departments } = useQuery(departmentsQuery)
  const form = useForm<PriorityFormValues>({
    resolver: standardSchemaResolver(priorityFormSchema),
    defaultValues: {
      name: priority?.name ?? '',
      color: priority?.color ?? '#2563eb',
      position: priority?.position ?? 0,
      department: priority?.department ?? departments?.[0]?.id ?? 0
    }
  })

  const mutation = useUpsertPriority(onSuccess)
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: priority?.id, values }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.name)}>
          <FieldLabel htmlFor='priority-name'>Name</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='priority-name'
              placeholder='e.g. ASAP'
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={invalid(errors.department)}>
          <FieldLabel htmlFor='priority-department'>Department</FieldLabel>
          {/* A priority belongs to one department and is never seen outside it. */}
          <Controller
            control={form.control}
            name='department'
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={value => field.onChange(Number(value))}
              >
                <SelectTrigger id='priority-department'>
                  <SelectValue placeholder='Pick a department' />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map(department => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.department]} />
        </Field>

        <Field data-invalid={invalid(errors.position)}>
          <FieldLabel htmlFor='priority-position'>Hierarchy</FieldLabel>
          {/* A lower number sorts first, which is what the board calls the hierarchy. */}
          <InputGroup>
            <InputGroupInput
              id='priority-position'
              type='number'
              min={0}
              inputMode='numeric'
              aria-invalid={invalid(errors.position)}
              {...form.register('position', { valueAsNumber: true })}
            />
          </InputGroup>
          <FieldError errors={[errors.position]} />
        </Field>

        <Field data-invalid={invalid(errors.color)}>
          <FieldLabel htmlFor='priority-color'>Colour</FieldLabel>
          {/* The colour is how a prioritised row is read before the word is: the pill takes it. */}
          <span className='flex items-center gap-2'>
            <Controller
              control={form.control}
              name='color'
              render={({ field }) => (
                <Input
                  id='priority-color'
                  type='color'
                  className='w-16'
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Input
              aria-label='Colour, as a hex value'
              className='w-32'
              {...form.register('color')}
            />
          </span>
          <FieldError errors={[errors.color]} />
        </Field>

        <Button
          type='submit'
          className='mt-2 self-start'
          disabled={mutation.isPending || !form.formState.isDirty}
        >
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          {priority ? 'Update' : 'Create'}
        </Button>
      </FieldGroup>
    </form>
  )
}

export const CreatePriorityDialog = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Create priority
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create priority</DialogTitle>
        </DialogHeader>
        {/* Remounts with the dialog so a cancelled draft is not there the next time it opens. */}
        {open && <PriorityForm onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

type UpdatePriorityDialogProps = {
  priority: Priority
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UpdatePriorityDialog = ({
  priority,
  open,
  onOpenChange
}: UpdatePriorityDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update priority</DialogTitle>
      </DialogHeader>
      {open && <PriorityForm priority={priority} onSuccess={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>
)
