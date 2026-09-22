import { authApi, publicApi } from '@/api/client'
import { queryClient } from '@/lib/query-client'
import { sessionStore } from '@/lib/session-store'
import { queryOptions } from '@tanstack/react-query'
import * as z from 'zod/mini'
import { userIdFromToken } from './lib/jwt'

export const credentialsSchema = z.object({
  email: z.string().check(z.minLength(1, 'Email is required'), z.email('Enter a valid email')),
  password: z.string().check(z.minLength(1, 'Password is required'))
})

export type Credentials = z.infer<typeof credentialsSchema>

// POST /token/ answers with BearerResponseRefresh, not the fastapi-users default its OpenAPI entry
// advertises: the tokens come back as `access`/`refresh`, alongside the user.
const bearerSchema = z.object({
  access: z.string(),
  refresh: z.string()
})

const userSchema = z.object({
  id: z.number(),
  email: z._default(z.string(), ''),
  first_name: z._default(z.string(), ''),
  last_name: z._default(z.string(), ''),
  role: z.string(),
  is_active: z._default(z.boolean(), true)
})

export type User = z.infer<typeof userSchema>

export const login = async (credentials: Credentials) => {
  const body = await publicApi.post('token/', { json: credentials }).json()
  const bearer = bearerSchema.parse(body)
  sessionStore.set({ accessToken: bearer.access, refreshToken: bearer.refresh })
}

export const logout = () => {
  sessionStore.set(null)
  queryClient.clear()
}

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const
}

export const meQuery = queryOptions({
  queryKey: authKeys.me(),
  queryFn: async () => {
    const session = sessionStore.get()
    const id = session && userIdFromToken(session.accessToken)
    if (!id) throw new Error('The access token carries no user id.')
    return userSchema.parse(await authApi.get(`users/${id}/`).json())
  }
})

export const forgotPasswordSchema = z.object({
  email: z.string().check(z.minLength(1, 'Email is required'), z.email('Enter a valid email'))
})

export type ForgotPassword = z.infer<typeof forgotPasswordSchema>

// The API answers 202 for an unknown address as well, so the form never says whether the
// account exists.
export const forgotPassword = (values: ForgotPassword) =>
  publicApi.post('users/password-reset/', { json: values }).json()

// Mirrors the backend rule, down to the punctuation set it accepts, so a slip is caught
// before the round trip and nothing valid is turned away.
const SPECIAL_CHARACTER = /[!#"$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/

const passwordSchema = z
  .string()
  .check(
    z.minLength(8, 'At least 8 characters'),
    z.maxLength(128, 'At most 128 characters'),
    z.regex(/[a-z]/, 'Add a lowercase letter'),
    z.regex(/[A-Z]/, 'Add an uppercase letter'),
    z.regex(/\d/, 'Add a digit'),
    z.regex(SPECIAL_CHARACTER, 'Add a special character, such as ! or ?')
  )

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().check(z.minLength(1, 'Confirm the new password'))
  })
  .check(
    z.refine(values => values.password === values.confirmPassword, {
      error: 'The passwords do not match',
      path: ['confirmPassword']
    })
  )

export type ResetPassword = z.infer<typeof resetPasswordSchema>

type ResetPasswordLink = {
  uid64: string
  token: string
}

// `uid64` and `token` travel in the path and the body both, as the endpoint reads them from
// the body and only matches on the path.
export const resetPassword = ({ uid64, token }: ResetPasswordLink, values: ResetPassword) =>
  publicApi
    .post(`users/password-reset-confirm/${uid64}/${token}/`, {
      json: {
        uid64,
        token,
        new_password1: values.password,
        new_password2: values.confirmPassword
      }
    })
    .json()
