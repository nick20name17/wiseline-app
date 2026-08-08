import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { useLogin, type Credentials } from '@/api/auth'
import { sessionStore } from '@/api/auth/session-store'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined)
})

const formSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required')
})

// seeded in src/mocks/mock-server.ts — remove alongside the mock backend
const DEMO_CREDENTIALS: Credentials = { email: 'demo@example.com', password: 'demo1234' }

const FIELDS = [
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' }
] as const satisfies ReadonlyArray<{
  name: keyof Credentials
  label: string
  type: string
  autoComplete: string
}>

export const Route = createFileRoute('/sign-in')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (sessionStore.get()) throw redirect({ to: search.redirect ?? '/' })
  },
  component: SignInPage
})

function SignInPage() {
  const router = useRouter()
  const { redirect: redirectTo } = Route.useSearch()
  const login = useLogin()

  const { register, handleSubmit, formState } = useForm<Credentials>({
    resolver: zodResolver(formSchema),
    defaultValues: DEMO_CREDENTIALS
  })

  const onSubmit = handleSubmit(async values => {
    await login.mutateAsync(values)
    await router.navigate({ to: redirectTo ?? '/' })
  })

  return (
    <main className='flex min-h-svh items-center justify-center p-6'>
      <form onSubmit={onSubmit} className='w-full max-w-sm'>
        <FieldGroup>
          <div className='flex flex-col gap-1 text-center'>
            <h1 className='text-xl font-semibold'>Sign in</h1>
            <p className='text-muted-foreground text-sm'>Sign in with the seeded demo account.</p>
          </div>

          <div className='bg-muted text-muted-foreground rounded-lg border px-3 py-2 text-center font-mono text-xs'>
            {DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}
          </div>

          {FIELDS.map(field => {
            const error = formState.errors[field.name]
            return (
              <Field key={field.name} data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
                <Input
                  id={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  aria-invalid={Boolean(error)}
                  {...register(field.name)}
                />
                <FieldError errors={[error]} />
              </Field>
            )
          })}

          <Button type='submit' disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </FieldGroup>
      </form>
    </main>
  )
}
