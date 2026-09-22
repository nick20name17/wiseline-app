import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
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
  categoriesQuery,
  departmentsQuery,
  KIND_LABELS,
  MACHINE_KINDS,
  machineFormSchema,
  useUpsertMachine,
  type Machine,
  type MachineForm as MachineFormValues,
  type MachineKind
} from '../api'

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

// An empty ceiling means «no ceiling», which the API stores as null rather than 0.
const asNumber = (value: string | number | null) => {
  const typed = `${value ?? ''}`.trim()
  return typed === '' ? null : Number(typed)
}

type MachineFormProps = {
  machine?: Machine
  onSuccess: () => void
}

const MachineForm = ({ machine, onSuccess }: MachineFormProps) => {
  const { data: departments } = useQuery(departmentsQuery)
  const { data: categories } = useQuery(categoriesQuery)

  const form = useForm<MachineFormValues>({
    resolver: standardSchemaResolver(machineFormSchema),
    defaultValues: {
      name: machine?.name ?? '',
      category: machine?.category ?? categories?.[0]?.id ?? '',
      department: machine?.department ?? departments?.[0]?.id ?? 0,
      kind: machine?.kind ?? 'bending',
      position: machine?.position ?? 0,
      daily_max_pieces: machine?.daily_max_pieces ?? null,
      daily_max_bends: machine?.daily_max_bends ?? null
    }
  })

  const mutation = useUpsertMachine(onSuccess)
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: machine?.id, values }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.name)}>
          <FieldLabel htmlFor='machine-name'>Name</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='machine-name'
              placeholder='e.g. Press Brake'
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={invalid(errors.department)}>
          <FieldLabel htmlFor='machine-department'>Department</FieldLabel>
          <Controller
            control={form.control}
            name='department'
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={value => field.onChange(Number(value))}
              >
                <SelectTrigger id='machine-department'>
                  {/* The trigger holds the id; the name is what the eye is looking for. */}
                  <SelectValue>
                    {(id: string) =>
                      departments?.find(department => department.id === Number(id))?.name ??
                      'Pick a department'
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

        <Field data-invalid={invalid(errors.category)}>
          <FieldLabel htmlFor='machine-category'>EBMS category</FieldLabel>
          {/* What routes a line item here: the category is the link between EBMS and a department. */}
          <Controller
            control={form.control}
            name='category'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id='machine-category'>
                  <SelectValue>
                    {(id: string) =>
                      categories?.find(category => category.id === id)?.name ?? 'Pick a category'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories?.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name ?? category.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.category]} />
        </Field>

        <Field data-invalid={invalid(errors.kind)}>
          <FieldLabel htmlFor='machine-kind'>What it does</FieldLabel>
          {/* The kind is what tells the Production tab a cutter from a bender. */}
          <Controller
            control={form.control}
            name='kind'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id='machine-kind'>
                  <SelectValue>
                    {(kind: string) => KIND_LABELS[kind as MachineKind] ?? 'Pick one'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_KINDS.map(kind => (
                    <SelectItem key={kind} value={kind}>
                      {KIND_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.kind]} />
        </Field>

        <Field data-invalid={invalid(errors.daily_max_bends)}>
          <FieldLabel htmlFor='machine-bends'>Daily max bends</FieldLabel>
          {/* The figure Machine Capacities holds the day against; empty means no ceiling. */}
          <InputGroup>
            <InputGroupInput
              id='machine-bends'
              type='number'
              min={0}
              inputMode='numeric'
              placeholder='No ceiling'
              aria-invalid={invalid(errors.daily_max_bends)}
              {...form.register('daily_max_bends', { setValueAs: asNumber })}
            />
          </InputGroup>
          <FieldError errors={[errors.daily_max_bends]} />
        </Field>

        <Field data-invalid={invalid(errors.daily_max_pieces)}>
          <FieldLabel htmlFor='machine-pieces'>Daily max pieces</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='machine-pieces'
              type='number'
              min={0}
              inputMode='numeric'
              placeholder='No ceiling'
              aria-invalid={invalid(errors.daily_max_pieces)}
              {...form.register('daily_max_pieces', { setValueAs: asNumber })}
            />
          </InputGroup>
          <FieldError errors={[errors.daily_max_pieces]} />
        </Field>

        <Field data-invalid={invalid(errors.position)}>
          <FieldLabel htmlFor='machine-position'>Position</FieldLabel>
          {/* The order the machine tabs stand in, left to right. */}
          <InputGroup>
            <InputGroupInput
              id='machine-position'
              type='number'
              min={0}
              inputMode='numeric'
              aria-invalid={invalid(errors.position)}
              {...form.register('position', { valueAsNumber: true })}
            />
          </InputGroup>
          <FieldError errors={[errors.position]} />
        </Field>

        <Button
          type='submit'
          className='mt-2 self-start'
          disabled={mutation.isPending || !form.formState.isDirty}
        >
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          {machine ? 'Update' : 'Create'}
        </Button>
      </FieldGroup>
    </form>
  )
}

/** The pickers a machine cannot be written without. */
const useReady = () => {
  const { data: departments } = useQuery(departmentsQuery)
  const { data: categories } = useQuery(categoriesQuery)
  return !!departments && !!categories
}

export const CreateMachineDialog = () => {
  const [open, setOpen] = useState(false)
  const ready = useReady()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Create machine
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create machine</DialogTitle>
        </DialogHeader>
        {/* Remounts with the dialog so a cancelled draft is not there the next time it opens. */}
        {open && ready ? <MachineForm onSuccess={() => setOpen(false)} /> : <Spinner />}
      </DialogContent>
    </Dialog>
  )
}

type UpdateMachineDialogProps = {
  machine: Machine
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UpdateMachineDialog = ({ machine, open, onOpenChange }: UpdateMachineDialogProps) => {
  const ready = useReady()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update machine</DialogTitle>
        </DialogHeader>
        {open && ready ? (
          <MachineForm machine={machine} onSuccess={() => onOpenChange(false)} />
        ) : (
          <Spinner />
        )}
      </DialogContent>
    </Dialog>
  )
}
