import { useForm } from '@tanstack/react-form'

import { LoginPayloadSchema } from '@/api/auth/schema'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/providers/auth'

export const LoginForm = () => {
  const { loginMutation } = useAuth()

  const form = useForm({
    defaultValues: {
      email: '',
      password: ''
    },
    validators: {
      onSubmit: LoginPayloadSchema
    },
    onSubmit: async ({ value }) => {
      await loginMutation.mutateAsync(value, {
        onSuccess: () => form.reset()
      })
    }
  })

  return (
    <div className='mx-auto w-full sm:max-w-sm'>
      <form
        noValidate
        id='login-form'
        className='space-y-4'
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field
            name='email'
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>

                  <Input
                    id={field.name}
                    name={field.name}
                    type='email'
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                    disabled={loginMutation.isPending}
                    placeholder='example@mail.com'
                  />

                  {isInvalid && <FieldError errors={[field.state.meta.errors[0]]} />}
                </Field>
              )
            }}
          />

          <form.Field
            name='password'
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>

                  <PasswordInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                    disabled={loginMutation.isPending}
                  />

                  {isInvalid && <FieldError errors={[field.state.meta.errors[0]]} />}
                </Field>
              )
            }}
          />
        </FieldGroup>

        <Button
          type='submit'
          form='login-form'
          className='w-full'
          disabled={loginMutation.isPending}
          isLoading={loginMutation.isPending}
        >
          Sign in
        </Button>
      </form>
    </div>
  )
}
