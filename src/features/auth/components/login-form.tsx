import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/errors'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { credentialsSchema, login, type Credentials } from '../api'

type LoginFormProps = {
  onSuccess: () => Promise<void> | void
}

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const queryClient = useQueryClient()

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
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate(values))}
      className='mx-auto w-full max-w-sm'
    >
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Use your Wiseline account.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input
                id='email'
                type='email'
                autoComplete='email'
                aria-invalid={errors.email ? true : undefined}
                {...form.register('email')}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor='password'>Password</FieldLabel>
              <Input
                id='password'
                type='password'
                autoComplete='current-password'
                aria-invalid={errors.password ? true : undefined}
                {...form.register('password')}
              />
              <FieldError errors={[errors.password]} />
            </Field>
            {mutation.isError && <FieldError>{getErrorMessage(mutation.error)}</FieldError>}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type='submit' disabled={mutation.isPending} className='w-full'>
            {mutation.isPending && <Spinner data-icon='inline-start' />}
            Log in
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
