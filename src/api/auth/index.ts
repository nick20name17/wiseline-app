import { useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api'
import { SessionSchema, UserSchema } from '@/api/auth/schema'
import { sessionStore } from '@/api/auth/session-store'

export type Credentials = { email: string; password: string }

export const login = (credentials: Credentials) =>
  api
    .post('auth/login', { json: credentials })
    .json()
    .then(data => SessionSchema.parse(data))
    .then(session => {
      sessionStore.set(session)
      return session
    })

export const logout = async () => {
  try {
    await api.post('auth/logout')
  } catch {}
  sessionStore.clear()
}

export const fetchMe = () =>
  api
    .get('auth/me')
    .json()
    .then(data => UserSchema.parse(data))

export const useLogin = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] })
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.clear()
  })
}
