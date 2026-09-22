import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/errors'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, MailCheck, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { forgotPassword, forgotPasswordSchema, type ForgotPassword } from '../api'
import { AuthCard } from './auth-card'

const BackToSignIn = () => (
  <Link
    to='/login'
    className='flex items-center justify-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
  >
    <ArrowLeft className='size-3.5' />
    Back to sign in
  </Link>
)

export const ForgotPasswordForm = () => {
  const form = useForm<ForgotPassword>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: { email: '' }
  })

  const mutation = useMutation({
    mutationFn: forgotPassword,
    meta: { skipErrorToast: true }
  })

  const { errors } = form.formState

  if (mutation.isSuccess) {
    return (
      <AuthCard
        title='Check your email'
        description={`If an account uses ${form.getValues('email')}, a reset link is on its way.`}
      >
        <FieldGroup>
          <MailCheck className='mx-auto size-8 text-muted-foreground' />
          <p className='text-center text-xs text-muted-foreground'>
            The link expires after a while. Nothing arrived? Look in the spam folder, or ask again.
          </p>
          <Button variant='outline' className='w-full' onClick={() => mutation.reset()}>
            Use another email
          </Button>
          <BackToSignIn />
        </FieldGroup>
      </AuthCard>
    )
  }

  return (
    <AuthCard title='Forgot password' description='Enter your email and we will send a reset link'>
      <form onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
        <FieldGroup>
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor='email'>Email</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Mail />
              </InputGroupAddon>
              <InputGroupInput
                id='email'
                type='email'
                autoComplete='email'
                placeholder='you@wiseline.com'
                aria-invalid={errors.email ? true : undefined}
                {...form.register('email')}
              />
            </InputGroup>
            <FieldError errors={[errors.email]} />
          </Field>

          {mutation.isError && (
            <FieldError className='text-center'>{getErrorMessage(mutation.error)}</FieldError>
          )}

          <Button type='submit' disabled={mutation.isPending} className='mt-2 w-full'>
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            Send reset link
          </Button>

          <BackToSignIn />
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
