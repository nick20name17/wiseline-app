import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { RequestResetPasswordSchema } from '@/api/password/schema'
import { passwordService } from '@/api/password/service'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export const ForgetPasswordForm = () => {
  const requestResetPasswordMutation = useMutation({
    mutationFn: passwordService.requestReset,
    onSuccess: () => {
      toast.success('Check your email for the password reset link')
      form.reset()
    }
  })

  const form = useForm({
    defaultValues: {
      email: ''
    },
    validators: {
      onSubmit: RequestResetPasswordSchema
    },
    onSubmit: ({ value }) => {
      requestResetPasswordMutation.mutate(value)
    }
  })

  return (
    <div className='mx-auto w-full sm:max-w-sm'>
      <form
        id='forget-password-form'
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
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder='example@mail.com'
                    aria-invalid={isInvalid}
                    disabled={requestResetPasswordMutation.isPending}
                  />
                  {isInvalid && <FieldError errors={[field.state.meta.errors[0]]} />}
                </Field>
              )
            }}
          />
        </FieldGroup>

        <Button
          type='submit'
          form='forget-password-form'
          className='w-full'
          disabled={requestResetPasswordMutation.isPending}
          isLoading={requestResetPasswordMutation.isPending}
        >
          Reset Password
        </Button>
      </form>
    </div>
  )
}
