import { RiAddCircleLine } from '@remixicon/react'
import { useStore } from '@tanstack/react-form'
import { useState } from 'react'
import * as z from 'zod/mini'

import { BasicUserRoleSelect } from '../selects/basic-role'
import { ProcessTypeSelect } from '../selects/process-type'
import { ProductionTypeSelect } from '../selects/prod-type'

import { PasswordSchema } from '@/api/schema'
import { useUpsertUser } from '@/api/users/query'
import { type CreateUserPayload, CreateUserSchema, type User } from '@/api/users/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { useAppForm } from '@/hooks/app-form'
import type { ModalState } from '@/types/modal'

const normalizeUserPayload = (payload: CreateUserPayload): CreateUserPayload => {
  if (payload.role === 'driver') {
    return {
      ...payload,
      prod_types: [],
      process_types: ['driver']
    }
  }

  if (payload.role === 'admin') {
    return {
      ...payload,
      prod_types: [],
      process_types: []
    }
  }

  if (payload.role === 'super_manager') {
    return {
      ...payload,
      prod_types: []
    }
  }

  return payload
}

interface UpsertUsersFormProps {
  onSuccess: () => void
  user?: User
}

const UpsertUsersForm = ({ user, onSuccess }: UpsertUsersFormProps) => {
  const isEdit = !!user

  const { handleUpsertUser, isPending } = useUpsertUser({
    onSuccess: () => {
      onSuccess()
      if (!isEdit) form.reset()
    }
  })

  const currentUserSchema = isEdit
    ? CreateUserSchema
    : z.object({ ...CreateUserSchema.shape, password: PasswordSchema })

  const form = useAppForm({
    defaultValues: {
      email: user?.email ?? '',
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      role: user?.role ?? 'worker',
      process_types: user?.process_types ?? [],
      prod_types: user?.prod_types ?? [],
      ...(isEdit ? {} : { password: '' })
    },
    validators: {
      onSubmit: currentUserSchema
    },
    onSubmit: ({ value }) => {
      const payload = normalizeUserPayload(currentUserSchema.parse(value))

      handleUpsertUser({ id: user?.id, payload })
    }
  })

  const { role, process_types } = useStore(form.store, (state) => state.values)

  return (
    <form
      className='space-y-4'
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.AppField
        name='email'
        children={(field) => (
          <field.TextField
            label='Email'
            placeholder='example@gmail.com'
            type='email'
          />
        )}
      />

      <div className='grid grid-cols-2 gap-3.5'>
        <form.AppField
          name='first_name'
          children={(field) => (
            <field.TextField
              label='First Name'
              placeholder='John'
            />
          )}
        />

        <form.AppField
          name='last_name'
          children={(field) => (
            <field.TextField
              label='Last Name'
              placeholder='Doe'
            />
          )}
        />
      </div>

      {role === 'admin' || role === 'driver' ? null : (
        <div className='grid grid-cols-1 gap-3.5'>
          <form.Field
            name='process_types'
            children={(field) => {
              const invalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={invalid}>
                  <Label>Departments</Label>
                  <ProcessTypeSelect
                    className='w-full'
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                  {invalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />
          {role === 'super_manager' || !process_types.includes('production') ? null : (
            <form.Field
              name='prod_types'
              children={(field) => {
                const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={invalid}>
                    <Label>Production Type</Label>
                    <ProductionTypeSelect
                      className='w-full'
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                    {invalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />
          )}
        </div>
      )}

      <form.Field
        name='role'
        children={(field) => {
          const invalid = field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={invalid}>
              <Label>Role</Label>
              <BasicUserRoleSelect
                className='w-full'
                value={field.state.value}
                onChange={field.handleChange}
              />
              {invalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      />

      {isEdit ? null : (
        <form.Field
          name='password'
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={invalid}>
                <Label>Password</Label>
                <PasswordInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={invalid}
                />
                {invalid && <FieldError errors={[field.state.meta.errors[0]]} />}
              </Field>
            )
          }}
        />
      )}

      <Button
        type='submit'
        className='w-24'
        isLoading={isPending}
        disabled={isPending}
      >
        {isEdit ? 'Update' : 'Create'}
      </Button>
    </form>
  )
}

export const CreateUserModal = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button>
          <RiAddCircleLine />
          <span>Create user</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
        </DialogHeader>
        <UpsertUsersForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

interface UpdateUserModalProps extends ModalState {
  user?: User
}

export const UpdateUserModal = ({ user, open, setOpen }: UpdateUserModalProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update user</DialogTitle>
        </DialogHeader>
        <UpsertUsersForm
          user={user}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
