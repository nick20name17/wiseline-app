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
import { Spinner } from '@/components/ui/spinner'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { newUserFormSchema, useUpsertUser, userFormSchema, type User, type UserForm } from '../api'
import {
  PROCESS_TYPES,
  PRODUCTION_TYPES,
  type ProcessType,
  type ProductionType
} from '../lib/roles'
import { RoleSelect } from './role-select'
import { TypesSelect } from './types-select'

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

type UserTypeFieldsProps = {
  form: UseFormReturn<UserForm>
  role: UserForm['role']
  processTypes: ProcessType[]
}

/** The department and production pickers, which only some roles answer for. */
const UserTypeFields = ({ form, role, processTypes }: UserTypeFieldsProps) => {
  // An admin never stands at a machine and a driver only drives, so neither picks a department.
  const picksDepartments = role !== 'admin' && role !== 'driver'
  // A super manager watches every production type; the rest pick theirs, and only on production.
  const picksProduction =
    picksDepartments && role !== 'super_manager' && processTypes.includes('production')

  const { errors } = form.formState

  return (
    <>
      {picksDepartments && (
        <Field data-invalid={invalid(errors.process_types)}>
          <FieldLabel htmlFor='user-departments'>Departments</FieldLabel>
          <Controller
            control={form.control}
            name='process_types'
            render={({ field }) => (
              <TypesSelect
                id='user-departments'
                options={PROCESS_TYPES}
                value={field.value}
                onChange={field.onChange}
                placeholder='Pick departments'
                invalid={invalid(errors.process_types)}
              />
            )}
          />
          <FieldError errors={[errors.process_types]} />
        </Field>
      )}

      {picksProduction && (
        <Field data-invalid={invalid(errors.prod_types)}>
          <FieldLabel htmlFor='user-production'>Production Type</FieldLabel>
          <Controller
            control={form.control}
            name='prod_types'
            render={({ field }) => (
              <TypesSelect
                id='user-production'
                options={PRODUCTION_TYPES}
                value={field.value}
                onChange={field.onChange}
                placeholder='Pick production types'
                invalid={invalid(errors.prod_types)}
              />
            )}
          />
          <FieldError errors={[errors.prod_types]} />
        </Field>
      )}
    </>
  )
}

type UserFormProps = {
  user?: User
  onSuccess: () => void
}

const UserFormFields = ({ user, onSuccess }: UserFormProps) => {
  const form = useForm<UserForm>({
    resolver: standardSchemaResolver(user ? userFormSchema : newUserFormSchema),
    defaultValues: {
      email: user?.email ?? '',
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      role: (user?.role as UserForm['role']) ?? 'worker',
      process_types: (user?.process_types ?? []) as ProcessType[],
      prod_types: (user?.prod_types ?? []) as ProductionType[],
      ...(user ? {} : { password: '' })
    }
  })

  const mutation = useUpsertUser(onSuccess)
  const { errors } = form.formState
  const role = useWatch({ control: form.control, name: 'role' })
  const processTypes = useWatch({ control: form.control, name: 'process_types' })

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: user?.id, values }))}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid(errors.email)}>
          <FieldLabel htmlFor='user-email'>Email</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='user-email'
              type='email'
              autoComplete='off'
              placeholder='you@wiseline.com'
              aria-invalid={invalid(errors.email)}
              {...form.register('email')}
            />
          </InputGroup>
          <FieldError errors={[errors.email]} />
        </Field>

        <div className='grid grid-cols-2 gap-4'>
          <Field data-invalid={invalid(errors.first_name)}>
            <FieldLabel htmlFor='user-first-name'>First Name</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id='user-first-name'
                placeholder='John'
                aria-invalid={invalid(errors.first_name)}
                {...form.register('first_name')}
              />
            </InputGroup>
            <FieldError errors={[errors.first_name]} />
          </Field>

          <Field data-invalid={invalid(errors.last_name)}>
            <FieldLabel htmlFor='user-last-name'>Last Name</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id='user-last-name'
                placeholder='Doe'
                aria-invalid={invalid(errors.last_name)}
                {...form.register('last_name')}
              />
            </InputGroup>
            <FieldError errors={[errors.last_name]} />
          </Field>
        </div>

        <Field data-invalid={invalid(errors.role)}>
          <FieldLabel htmlFor='user-role'>Role</FieldLabel>
          <Controller
            control={form.control}
            name='role'
            render={({ field }) => (
              <RoleSelect
                id='user-role'
                value={field.value}
                onChange={field.onChange}
                invalid={invalid(errors.role)}
              />
            )}
          />
          <FieldError errors={[errors.role]} />
        </Field>

        <UserTypeFields form={form} role={role} processTypes={processTypes} />

        {!user && (
          <Field data-invalid={invalid(errors.password)}>
            <FieldLabel htmlFor='user-password'>Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id='user-password'
                type='password'
                autoComplete='new-password'
                aria-invalid={invalid(errors.password)}
                {...form.register('password')}
              />
            </InputGroup>
            <FieldError errors={[errors.password]} />
          </Field>
        )}

        <Button
          type='submit'
          className='mt-2 self-start'
          disabled={mutation.isPending || !form.formState.isDirty}
        >
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          {user ? 'Update' : 'Create'}
        </Button>
      </FieldGroup>
    </form>
  )
}

export const CreateUserDialog = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Create user
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
        </DialogHeader>
        {/* Remounts with the dialog so a cancelled draft is not there the next time it opens. */}
        {open && <UserFormFields onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

type UpdateUserDialogProps = {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UpdateUserDialog = ({ user, open, onOpenChange }: UpdateUserDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update user</DialogTitle>
      </DialogHeader>
      {open && <UserFormFields user={user} onSuccess={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>
)
