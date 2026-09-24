import { PasswordInput } from '@/components/password-input'
import { RequiredLabel } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { invalid } from '@/lib/form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { newUserFormSchema, useUpsertUser, userFormSchema, type User, type UserForm } from '../api'
import { reachesEveryDepartment, toDepartments } from '../lib/roles'
import { DepartmentChips } from './department-chips'
import { RoleSelect } from './role-select'

type UserFormProps = {
  user?: User
  onSuccess: () => void
}

const UserFormFields = ({ user, onSuccess }: UserFormProps) => {
  const form = useForm<UserForm>({
    resolver: standardSchemaResolver(user ? userFormSchema : newUserFormSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email ?? '',
      role: (user?.role as UserForm['role']) ?? 'worker',
      departments: user ? toDepartments(user) : [],
      ...(user ? {} : { password: '' })
    }
  })

  const mutation = useUpsertUser(onSuccess)
  const { errors } = form.formState
  const role = useWatch({ control: form.control, name: 'role' })

  // An admin reaches every department and a driver only drives, so neither picks any.
  const picksDepartments = !reachesEveryDepartment(role) && role !== 'driver'

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: user?.id, values }))}
      noValidate
    >
      <FieldGroup>
        <div className='grid grid-cols-2 gap-4'>
          <Field data-invalid={invalid(errors.first_name)}>
            <RequiredLabel htmlFor='user-first-name'>First Name</RequiredLabel>
            <InputGroup>
              <InputGroupInput
                id='user-first-name'
                placeholder='e.g. John'
                aria-invalid={invalid(errors.first_name)}
                {...form.register('first_name')}
              />
            </InputGroup>
            <FieldError errors={[errors.first_name]} />
          </Field>

          <Field data-invalid={invalid(errors.last_name)}>
            <RequiredLabel htmlFor='user-last-name'>Last Name</RequiredLabel>
            <InputGroup>
              <InputGroupInput
                id='user-last-name'
                placeholder='e.g. Enns'
                aria-invalid={invalid(errors.last_name)}
                {...form.register('last_name')}
              />
            </InputGroup>
            <FieldError errors={[errors.last_name]} />
          </Field>
        </div>

        <Field data-invalid={invalid(errors.email)}>
          <RequiredLabel htmlFor='user-email'>Email</RequiredLabel>
          <InputGroup>
            <InputGroupInput
              id='user-email'
              type='email'
              autoComplete='off'
              placeholder='e.g. john@wiseline.app'
              aria-invalid={invalid(errors.email)}
              {...form.register('email')}
            />
          </InputGroup>
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={invalid(errors.role)}>
          <RequiredLabel htmlFor='user-role'>Role</RequiredLabel>
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

        {picksDepartments && (
          <Field data-invalid={invalid(errors.departments)}>
            <FieldLabel>Departments</FieldLabel>
            <Controller
              control={form.control}
              name='departments'
              render={({ field }) => (
                <DepartmentChips value={field.value} onChange={field.onChange} />
              )}
            />
            <FieldError errors={[errors.departments]} />
          </Field>
        )}

        {!user && (
          <Field data-invalid={invalid(errors.password)}>
            <RequiredLabel htmlFor='user-password'>Password</RequiredLabel>
            <PasswordInput
              id='user-password'
              autoComplete='new-password'
              placeholder='••••••••'
              aria-invalid={invalid(errors.password)}
              {...form.register('password')}
            />
            <FieldError errors={[errors.password]} />
          </Field>
        )}
      </FieldGroup>

      <DialogFooter className='mt-6'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={mutation.isPending || !form.formState.isDirty}>
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}

export const CreateUserDialog = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon='inline-start' />
        Add user
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        <UserFormFields onSuccess={() => setOpen(false)} />
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
        <DialogTitle>Edit user</DialogTitle>
      </DialogHeader>
      <UserFormFields user={user} onSuccess={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
)
