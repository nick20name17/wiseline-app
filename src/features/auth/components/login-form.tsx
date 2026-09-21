import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/errors'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { credentialsSchema, login, type Credentials } from '../api'

type LoginFormProps = {
  onSuccess: () => Promise<void> | void
}

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const queryClient = useQueryClient()
  const [passwordVisible, setPasswordVisible] = useState(false)

  const form = useForm<Credentials>({
    resolver: standardSchemaResolver(credentialsSchema),
    defaultValues: { email: '', password: '' }
  })

  const mutation = useMutation({
    mutationFn: login,
    meta: { skipErrorToast: true },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] })
      await onSuccess()
    }
  })

  const { errors } = form.formState

  return (
    <div className='w-full max-w-95 rounded-xl border border-border bg-card px-7.5 pt-8 pb-6.5 shadow-lg'>
      <div className='mb-6 flex items-center justify-center gap-2.5'>
        <img src='/icon-512.png' alt='' className='size-8.5 flex-none' />
        <div>
          <div className='font-heading text-lg leading-tight font-semibold tracking-tight'>
            Wiseline
          </div>
          <div className='text-xs tracking-wider text-muted-foreground uppercase'>Production</div>
        </div>
      </div>

      <h1 className='text-center text-xl font-semibold tracking-tight'>Sign in</h1>
      <p className='mt-1.5 mb-6 text-center text-xs text-muted-foreground'>
        Access the production floor dashboard
      </p>

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
              <InputGroup>
                <InputGroupAddon>
                  <Lock />
                </InputGroupAddon>
                <InputGroupInput
                  id='password'
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete='current-password'
                  placeholder='••••••••'
                  aria-invalid={errors.password ? true : undefined}
                  {...form.register('password')}
                />
                <InputGroupAddon align='inline-end'>
                  <InputGroupButton
                    size='icon-xs'
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible(visible => !visible)}
                  >
                    {passwordVisible ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
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
        </FieldGroup>
      </form>
    </div>
  )
}
