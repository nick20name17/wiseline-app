import { RequiredLabel } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { asAmount, invalid, WHOLE_INPUT } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  categoriesQuery,
  DEPARTMENT_KINDS,
  departmentCategoryQuery,
  departmentsQuery,
  isRequired,
  KIND_LABELS,
  MACHINE_KINDS,
  machineFormSchema,
  useUpsertMachine,
  type Department,
  type Machine,
  type MachineForm as MachineFormValues,
  type MachineKind
} from '../api'

type ProfilesInputProps = {
  id: string
  value: string[]
  invalid?: boolean
  onChange: (profiles: string[]) => void
}

/** The profiles as lines of text; the form holds them trimmed, blank lines dropped. */
const ProfilesInput = ({ id, value, invalid: isInvalid, onChange }: ProfilesInputProps) => {
  const [text, setText] = useState(() => value.join('\n'))
  return (
    <Textarea
      id={id}
      rows={3}
      placeholder={'e.g. Tuff Rib\nDiamond Rib'}
      aria-invalid={isInvalid}
      value={text}
      onChange={event => {
        setText(event.target.value)
        onChange(
          event.target.value
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
        )
      }}
    />
  )
}

type MachineFormProps = {
  machine?: Machine
  /** The department a new machine is added to, and the EBMS category its work arrives under. */
  department?: Department
  category?: string | null
  onSuccess: () => void
}

const MachineForm = ({ machine, department, category, onSuccess }: MachineFormProps) => {
  const { data: departments } = useQuery(departmentsQuery)
  const { data: categories } = useQuery(categoriesQuery)
  // A machine is added from its department's card, so the department is already said; only one
  // whose department is gone is asked for it again.
  const home = department ?? departments?.find(entry => entry.id === machine?.department)

  const form = useForm<MachineFormValues>({
    resolver: standardSchemaResolver(machineFormSchema),
    defaultValues: {
      name: machine?.name ?? '',
      category: machine?.category ?? category ?? categories?.[0]?.id ?? '',
      department: home?.id ?? departments?.[0]?.id ?? 0,
      kind: machine?.kind ?? (DEPARTMENT_KINDS[home?.code ?? ''] ?? MACHINE_KINDS)[0],
      ebms_profile_names: machine?.ebms_profile_names ?? [],
      daily_max_pieces: machine?.daily_max_pieces ?? null,
      daily_max_bends: machine?.daily_max_bends ?? null,
      daily_max_feet: machine?.daily_max_feet ?? null
    }
  })

  const kind = useWatch({ control: form.control, name: 'kind' })
  const departmentId = useWatch({ control: form.control, name: 'department' })
  const code = departments?.find(entry => entry.id === departmentId)?.code ?? ''
  // Only Rollforming's day is counted in feet, so only its machines are asked for a figure in them.
  const inFeet = code === 'rollforming'
  const kinds = DEPARTMENT_KINDS[code] ?? MACHINE_KINDS
  // Moving the Slinet, the Slit Line or Wrapping to other work would take it off the line it is
  // required on, as a delete would; its name and capacity stay editable.
  const required = !!machine && isRequired(machine.kind)
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

        {home ? null : (
          <Field data-invalid={invalid(errors.department)}>
            <RequiredLabel htmlFor='machine-department'>Department</RequiredLabel>
            <Controller
              control={form.control}
              name='department'
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={value => {
                    field.onChange(Number(value))
                    // A kind the new department does not run is not kept for it.
                    const next = departments?.find(entry => entry.id === Number(value))?.code ?? ''
                    const allowed: readonly string[] = DEPARTMENT_KINDS[next] ?? MACHINE_KINDS
                    if (!allowed.includes(form.getValues('kind')))
                      form.setValue('kind', allowed[0] ?? MACHINE_KINDS[0])
                  }}
                >
                  <SelectTrigger id='machine-department'>
                    {/* The trigger holds the id; the name is what the eye is looking for. */}
                    <SelectValue>
                      {(id: string) =>
                        departments?.find(entry => entry.id === Number(id))?.name ?? 'Select…'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map(entry => (
                      <SelectItem key={entry.id} value={String(entry.id)}>
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.department]} />
          </Field>
        )}

        <Field data-invalid={invalid(errors.category)}>
          <RequiredLabel htmlFor='machine-category'>EBMS category</RequiredLabel>
          {/* What routes a line item here: the category is the link between EBMS and a department. */}
          <Controller
            control={form.control}
            name='category'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={required}>
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
              <Select value={field.value} onValueChange={field.onChange} disabled={required}>
                <SelectTrigger id='machine-kind'>
                  <SelectValue>
                    {(kind: string) => KIND_LABELS[kind as MachineKind] ?? 'Pick one'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {kinds.map(kind => (
                    <SelectItem key={kind} value={kind}>
                      {KIND_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {required ? (
            <FieldDescription>
              The department's work passes through it, so its category and what it does stay as they
              are.
            </FieldDescription>
          ) : null}
          <FieldError errors={[errors.kind]} />
        </Field>

        {kind === 'rollforming' ? (
          <Field data-invalid={invalid(errors.ebms_profile_names)}>
            <FieldLabel htmlFor='machine-profiles'>EBMS profiles</FieldLabel>
            {/* «The Name assigned here would have to exactly match the Name given to the Machine»
                p2 (541,284): the Roll Options profiles whose lines this rollformer runs. */}
            <Controller
              control={form.control}
              name='ebms_profile_names'
              render={({ field }) => (
                <ProfilesInput
                  id='machine-profiles'
                  value={field.value}
                  invalid={invalid(errors.ebms_profile_names)}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldDescription>One per line, spelled as in EBMS.</FieldDescription>
            <FieldError errors={[errors.ebms_profile_names]} />
          </Field>
        ) : null}

        {inFeet ? (
          <Field data-invalid={invalid(errors.daily_max_feet)}>
            <FieldLabel htmlFor='machine-feet'>Daily max linear feet</FieldLabel>
            {/* What Rollforming's day tabs and Machine Capacities hold the day against. */}
            <InputGroup>
              <InputGroupInput
                id='machine-feet'
                {...WHOLE_INPUT}
                placeholder='No ceiling'
                aria-invalid={invalid(errors.daily_max_feet)}
                {...form.register('daily_max_feet', { setValueAs: asAmount })}
              />
            </InputGroup>
            <FieldError errors={[errors.daily_max_feet]} />
          </Field>
        ) : null}

        <Field data-invalid={invalid(errors.daily_max_bends)}>
          <FieldLabel htmlFor='machine-bends'>Daily max bends</FieldLabel>
          {/* The figure Machine Capacities holds the day against; empty means no ceiling. */}
          <InputGroup>
            <InputGroupInput
              id='machine-bends'
              {...WHOLE_INPUT}
              placeholder='No ceiling'
              aria-invalid={invalid(errors.daily_max_bends)}
              {...form.register('daily_max_bends', { setValueAs: asAmount })}
            />
          </InputGroup>
          <FieldError errors={[errors.daily_max_bends]} />
        </Field>

        <Field data-invalid={invalid(errors.daily_max_pieces)}>
          <FieldLabel htmlFor='machine-pieces'>Daily max pieces</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='machine-pieces'
              {...WHOLE_INPUT}
              placeholder='No ceiling'
              aria-invalid={invalid(errors.daily_max_pieces)}
              {...form.register('daily_max_pieces', { setValueAs: asAmount })}
            />
          </InputGroup>
          <FieldError errors={[errors.daily_max_pieces]} />
        </Field>
      </FieldGroup>

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

/** The pickers a machine cannot be written without. */
const useReady = () => {
  const { data: departments } = useQuery(departmentsQuery)
  const { data: categories } = useQuery(categoriesQuery)
  return !!departments && !!categories
}

type CreateMachineDialogProps = {
  department: Department
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CreateMachineBodyProps = { department: Department; onSuccess: () => void }

// Inside the popup, so the category is asked for only once the dialog opens.
const CreateMachineBody = ({ department, onSuccess }: CreateMachineBodyProps) => {
  const ready = useReady()
  // A department without one, or a failed read, still adds a machine: the category is picked.
  const { data: category, isPending } = useQuery(departmentCategoryQuery(department.id))
  return ready && !isPending ? (
    <MachineForm department={department} category={category} onSuccess={onSuccess} />
  ) : (
    <Spinner />
  )
}

// Opened from the card's header and from its empty list alike, so the card owns the open state.
export const CreateMachineDialog = ({
  department,
  open,
  onOpenChange
}: CreateMachineDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add {department.name} machine</DialogTitle>
      </DialogHeader>
      {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
      <CreateMachineBody department={department} onSuccess={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
)

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
