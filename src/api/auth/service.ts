import type { LoginPayload, LoginResponse, RefreshPayload, RefreshResponse } from './schema'
import { api } from '@/api'

export const authService = {
  refresh: async (payload: RefreshPayload) => {
    const { data } = await api.post<RefreshResponse>('/token/refresh/', payload)

    return data
  },
  login: async (payload: LoginPayload) => {
    const { data } = await api.post<LoginResponse>('/token/', payload)

    return data
  }
}
