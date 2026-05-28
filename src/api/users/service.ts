import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UsersResponse,
  UsersSearchParams
} from './schema'
import { api } from '@/api'

export const usersService = {
  get: async (params: UsersSearchParams = {}) => {
    const { data } = await api.get<UsersResponse>('/users/', { params })
    return data
  },
  getAll: async () => {
    const { data } = await api.get<User[]>('/users/all/')
    return data
  },
  create: async (payload: CreateUserPayload) => {
    const { data } = await api.post<User>('/users/', payload)
    return data
  },
  update: async ({ id, payload }: UpdateUserPayload) => {
    const { data } = await api.patch<User>(`/users/${id}/`, payload)
    return data
  },
  getById: async (id: number) => {
    const { data } = await api.get<User>(`/users/${id}/`)
    return data
  },
  delete: async (id: number) => {
    const { data } = await api.delete<User>(`/users/${id}/`)
    return data
  }
}
