import { authApi, publicApi } from '@/api/client'
import { sessionStore } from '@/lib/session-store'
import { queryClient } from '@/lib/query-client'
import { queryOptions } from '@tanstack/react-query'
import * as z from 'zod/mini'
import { userIdFromToken } from './lib/jwt'

export const credentialsSchema = z.object({
  email: z.string().check(z.minLength(1, 'Email is required'), z.email('Enter a valid email')),
  password: z.string().check(z.minLength(1, 'Password is required'))
})

export type Credentials = z.infer<typeof credentialsSchema>

// BearerResponse documents only `access_token`; the refresh token is accepted under either of the
// names the backend uses so the refresh flow works wherever it is actually returned.
const bearerSchema = z.object({
  access_token: z.string(),
  refresh_token: z.optional(z.string()),
  refresh: z.optional(z.string())
})

const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  is_active: z._default(z.boolean(), true)
})

export type User = z.infer<typeof userSchema>

export const login = async (credentials: Credentials) => {
  const body = await publicApi.post('token/', { json: credentials }).json()
  const bearer = bearerSchema.parse(body)
  sessionStore.set({
    accessToken: bearer.access_token,
    refreshToken: bearer.refresh_token ?? bearer.refresh ?? null
  })
}

export const logout = () => {
  sessionStore.set(null)
  queryClient.clear()
}

export const meQuery = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: async () => {
    const session = sessionStore.get()
    const id = session && userIdFromToken(session.accessToken)
    if (!id) throw new Error('The access token carries no user id.')
    return userSchema.parse(await authApi.get(`users/${id}/`).json())
  }
})
