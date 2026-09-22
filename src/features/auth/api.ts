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
