import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ResetConfirmPasswordsSchema } from '@/api/password/schema'
import { passwordService } from '@/api/password/service'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { PasswordInput } from '@/components/ui/password-input'

export const ResetConfirmPasswordForm = () => {
  const { token, uid64 } = useParams({
    from: '/password/reset/$token/$uid64'
  })

  const resetConfirmPasswordMutation = useMutation({
    mutationFn: passwordService.resetConfirm,
    onSuccess: () => {
      toast.success('Log in with your new password')
      form.reset()
    }
  })

  const form = useForm({
    defaultValues: {
      new_password1: '',
      new_password2: ''
    },
    validators: {
      onSubmit: ResetConfirmPasswordsSchema,
      onChange: ResetConfirmPasswordsSchema
    },
    onSubmit: ({ value }) => {
      resetConfirmPasswordMutation.mutate({
        ...value,
        token,
        uid64
      })
    }
  })

  return (
    <div className='mx-auto w-full sm:max-w-sm'>
      <form
        id='reset-confirm-password-form'
        className='space-y-4'
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field
            name='new_password1'
            children={(field) => {
              const firstError = field.state.meta.errors?.[0]
              const isInvalid = field.state.meta.isTouched && !!firstError

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>New password</FieldLabel>

                  <PasswordInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                    disabled={resetConfirmPasswordMutation.isPending}
                  />

                  {isInvalid && <FieldError errors={[firstError]} />}
                </Field>
              )
            }}
          />

          <form.Field
            name='new_password2'
            children={(field) => {
              const firstError = field.state.meta.errors?.[0]
              const isInvalid = field.state.meta.isTouched && !!firstError

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Confirm new password</FieldLabel>

                  <PasswordInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                    disabled={resetConfirmPasswordMutation.isPending}
                  />

                  {isInvalid && <FieldError errors={[firstError]} />}
                </Field>
              )
            }}
          />
        </FieldGroup>

        <Button
          type='submit'
          form='reset-confirm-password-form'
          className='w-full'
          disabled={resetConfirmPasswordMutation.isPending}
          isLoading={resetConfirmPasswordMutation.isPending}
        >
          Set new password
        </Button>
      </form>
    </div>
  )
}
