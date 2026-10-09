import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/errors'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { logout, resetPassword, resetPasswordSchema, type ResetPassword } from '../api'
import { AuthCard } from './auth-card'

type ResetPasswordFormProps = {
  uid64: string
  token: string
}

export const ResetPasswordForm = ({ uid64, token }: ResetPasswordFormProps) => {
  const form = useForm<ResetPassword>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  })

  const mutation = useMutation({
    mutationFn: (values: ResetPassword) => resetPassword({ uid64, token }, values),
    meta: { skipErrorToast: true },
    // The tokens held here were issued against the old password, so the reset ends the session
    // rather than letting `/login` wave the visitor back through on them.
    onSuccess: () => logout()
  })

  const { errors } = form.formState

  if (mutation.isSuccess) {
    return (
      <AuthCard title='Password changed' description='Sign in with your new password'>
        <FieldGroup>
          <CheckCircle2 className='mx-auto size-8 text-muted-foreground' />
          <Button className='w-full' render={<Link to='/login' />}>
            Go to sign in
          </Button>
        </FieldGroup>
      </AuthCard>
    )
  }

  return (
    <AuthCard title='Set a new password' description='Choose a password you have not used before'>
      <form onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
        <FieldGroup>
          <FieldGroup>
            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor='password'>New password</FieldLabel>
              <PasswordInput
                icon={<Lock />}
                id='password'
                autoComplete='new-password'
                placeholder='••••••••'
                aria-invalid={errors.password ? true : undefined}
                {...form.register('password')}
              />
              <FieldError errors={[errors.password]} />
              {errors.password ? null : (
                <FieldDescription>
                  At least 8 characters, with an uppercase and a lowercase letter, a digit and a
                  special character.
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.confirmPassword ? true : undefined}>
              <FieldLabel htmlFor='confirm-password'>Confirm password</FieldLabel>
              <PasswordInput
                icon={<Lock />}
                id='confirm-password'
                autoComplete='new-password'
                placeholder='••••••••'
                aria-invalid={errors.confirmPassword ? true : undefined}
                {...form.register('confirmPassword')}
              />
              <FieldError errors={[errors.confirmPassword]} />
            </Field>
          </FieldGroup>

          {mutation.isError && (
            <FieldError className='text-center'>{getErrorMessage(mutation.error)}</FieldError>
          )}

          <Button type='submit' disabled={mutation.isPending} className='mt-2 w-full'>
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            Change password
          </Button>

          <Link
            to='/forgot-password'
            className='text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
          >
            Request a new link
          </Link>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
