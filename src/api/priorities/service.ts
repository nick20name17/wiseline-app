import type {
  CreatePriorityPayload,
  PrioritiesApiResponse,
  Priority,
  UpdatePriorityPayload
} from './schema'
import { api } from '@/api'

export const prioritiesService = {
  get: async () => {
    const { data } = await api.get<PrioritiesApiResponse>('/priorities/')
    return data
  },
  create: async (payload: CreatePriorityPayload) => {
    const { data } = await api.post<Priority>('/priorities/', payload)
    return data
  },
  update: async ({ id, payload }: UpdatePriorityPayload) => {
    const { data } = await api.patch<Priority>(`/priorities/${id}/`, payload)
    return data
  },
  delete: async (id: number) => {
    const { data } = await api.delete<Priority>(`/priorities/${id}/`)
    return data
  }
}
