import { RequiredLabel } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle
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
import { asNumber, invalid } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useQuery } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
      ebms_profile_name: machine?.ebms_profile_name ?? null,
      daily_max_pieces: machine?.daily_max_pieces ?? null,
      daily_max_bends: machine?.daily_max_bends ?? null
    }
  })

  const kind = useWatch({ control: form.control, name: 'kind' })
  const mutation = useUpsertMachine(onSuccess)
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: machine?.id, values }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.name)}>
          <RequiredLabel htmlFor='machine-name'>Name</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='machine-name'
              placeholder='e.g. Slinet'
              aria-invalid={invalid(errors.name)}
              {...form.register('name')}
            />
          </InputGroup>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={invalid(errors.department)}>
          <RequiredLabel htmlFor='machine-department'>Department</RequiredLabel>
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

        <Field data-invalid={invalid(errors.category)}>
          <RequiredLabel htmlFor='machine-category'>EBMS category</RequiredLabel>
          {/* What routes a line item here: the category is the link between EBMS and a department. */}
          <Controller
            control={form.control}
            name='category'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id='machine-category'>
                  <SelectValue>
                    {(id: string) =>
                      categories?.find(category => category.id === id)?.name ?? 'Select…'
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
          <RequiredLabel htmlFor='machine-kind'>What it does</RequiredLabel>
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

        {kind === 'rollforming' ? (
          <Field data-invalid={invalid(errors.ebms_profile_name)}>
            <FieldLabel htmlFor='machine-profile'>EBMS profile</FieldLabel>
            {/* «The Name assigned here would have to exactly match the Name given to the Machine»
                p2 (541,284): the Roll Options profile whose lines this rollformer runs. */}
            <InputGroup>
              <InputGroupInput
                id='machine-profile'
                placeholder='e.g. Tuff Rib'
                maxLength={100}
                aria-invalid={invalid(errors.ebms_profile_name)}
                {...form.register('ebms_profile_name', {
                  setValueAs: (value: string | null) => value?.trim() || null
                })}
              />
            </InputGroup>
            <FieldError errors={[errors.ebms_profile_name]} />
          </Field>
        ) : null}

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

/** The pickers a machine cannot be written without. */
const useReady = () => {
  const { data: departments } = useQuery(departmentsQuery)
  const { data: categories } = useQuery(categoriesQuery)
  return !!departments && !!categories
}

type CreateMachineDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Opened from the toolbar and from an empty department alike, so the page owns the open state.
export const CreateMachineDialog = ({ open, onOpenChange }: CreateMachineDialogProps) => {
  const ready = useReady()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add machine</DialogTitle>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        {ready ? <MachineForm onSuccess={() => onOpenChange(false)} /> : <Spinner />}
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
          <DialogTitle>Edit machine</DialogTitle>
        </DialogHeader>
        {ready ? (
          <MachineForm machine={machine} onSuccess={() => onOpenChange(false)} />
        ) : (
          <Spinner />
        )}
      </DialogContent>
    </Dialog>
  )
}
