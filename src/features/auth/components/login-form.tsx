import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/errors'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { authKeys, credentialsSchema, login, type Credentials } from '../api'
import { AuthCard } from './auth-card'

type LoginFormProps = {
  onSuccess: () => Promise<void> | void
}

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const form = useForm<Credentials>({
    resolver: standardSchemaResolver(credentialsSchema),
    defaultValues: { email: '', password: '' }
  })

  const mutation = useMutation({
    mutationFn: login,
    meta: { skipErrorToast: true },
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: authKeys.all })
      await onSuccess()
    }
  })

  const { errors } = form.formState

  return (
    <AuthCard title='Sign in' description='Access the production floor dashboard'>
      <form onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
        <FieldGroup>
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

            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor='password'>Password</FieldLabel>
              <PasswordInput
                icon={<Lock />}
                id='password'
                autoComplete='current-password'
                placeholder='••••••••'
                aria-invalid={errors.password ? true : undefined}
                {...form.register('password')}
              />
              <FieldError errors={[errors.password]} />
            </Field>
          </FieldGroup>

          {mutation.isError && (
            <FieldError className='text-center'>{getErrorMessage(mutation.error)}</FieldError>
          )}

          <Button type='submit' disabled={mutation.isPending} className='mt-2 w-full'>
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            Continue
            {mutation.isPending ? null : <ArrowRight data-icon='inline-end' />}
          </Button>

          <Link
            to='/forgot-password'
            className='text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
          >
            Forgot your password?
          </Link>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
