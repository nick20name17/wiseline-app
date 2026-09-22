import { RequiredLabel, RequiredLegend } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldSet } from '@/components/ui/field'
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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusCircle } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  departmentsQuery,
  onBoard,
  prioritiesKeys,
  priorityFormSchema,
  useUpsertPriority,
  type Priority,
  type PriorityForm as PriorityFormValues
} from '../api'
import { PALETTE, paletteFor } from '../lib/palette'

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

type PriorityFormProps = {
  priority?: Priority
  /** The department a new priority starts in: the one on screen. */
  departmentId?: number
  onSuccess: () => void
}

const PriorityForm = ({ priority, departmentId, onSuccess }: PriorityFormProps) => {
  const { data: departments } = useQuery(departmentsQuery)
  const form = useForm<PriorityFormValues>({
    resolver: standardSchemaResolver(priorityFormSchema),
    defaultValues: {
      name: priority?.name ?? '',
      color: priority?.color ?? PALETTE[0].value,
      department: priority?.department ?? departmentId ?? departments?.[0]?.id ?? 0
    }
  })

  const mutation = useUpsertPriority(onSuccess)
  const client = useQueryClient()

  // Last on its department's board: past the highest number there, even if the numbers have gaps.
  // Read once on save from the list the page has loaded, rather than kept subscribed to.
  const nextPosition = (department: number) =>
    Math.max(
      0,
      ...(client.getQueryData<Priority[]>(prioritiesKeys.list()) ?? [])
        .filter(entry => onBoard(entry, department))
        .map(entry => entry.position)
    ) + 1
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(values =>
        mutation.mutate(
          // Moved to another department it goes last there too, not wherever its old number falls.
          priority && values.department === priority.department
            ? { id: priority.id, values }
            : { id: priority?.id, values: { ...values, position: nextPosition(values.department) } }
        )
      )}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.name)}>
          <RequiredLabel htmlFor='priority-name'>Name</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='priority-name'
              placeholder='e.g. Now'
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={invalid(errors.department)}>
          <RequiredLabel htmlFor='priority-department'>Department</RequiredLabel>
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
                  {/* The trigger holds the id; the name is what the eye is looking for. */}
                  <SelectValue>
                    {(id: string) =>
                      departments?.find(department => department.id === Number(id))?.name ??
                      'Select…'
                    }
                  </SelectValue>
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

        <FieldSet data-invalid={invalid(errors.color)}>
          <RequiredLegend>Colour</RequiredLegend>
          {/* The colour is how a prioritised row is read before the word is: the pill takes it. */}
          <div className='flex flex-wrap gap-2'>
            {paletteFor(priority?.color).map(entry => (
              <label
                key={entry.value}
                title={entry.name}
                className='relative size-9 cursor-pointer rounded-md bg-(--swatch) ring-offset-2 ring-offset-background transition-shadow has-checked:ring-2 has-checked:ring-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50'
                style={{ '--swatch': entry.value } as CSSProperties}
              >
                <input
                  type='radio'
                  className='sr-only'
                  value={entry.value}
                  aria-label={entry.name}
                  {...form.register('color')}
                />
              </label>
            ))}
          </div>
          <FieldError errors={[errors.color]} />
        </FieldSet>
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

type CreatePriorityDialogProps = {
  departmentId: number | undefined
}

export const CreatePriorityDialog = ({ departmentId }: CreatePriorityDialogProps) => {
  const [open, setOpen] = useState(false)
  // A form mounted before the departments would default to none and post a priority belonging
  // nowhere, which the server refuses.
  const { data: departments } = useQuery(departmentsQuery)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Add priority
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add priority</DialogTitle>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        {departments ? (
          <PriorityForm departmentId={departmentId} onSuccess={() => setOpen(false)} />
        ) : (
          <Spinner />
        )}
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
        <DialogTitle>Edit priority</DialogTitle>
      </DialogHeader>
      <PriorityForm priority={priority} onSuccess={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
)
