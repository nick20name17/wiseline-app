import type {
  CreateSkidsPayload,
  SkidMultiUpdatePayload,
  SkidParams,
  Skids,
  SkidsResponse,
  UpdateSkidsPayload
} from './schema'
import { api } from '@/api'

export const skidsService = {
  get: async (params: SkidParams = {}) => {
    const { data } = await api.get<SkidsResponse>('/skids/', { params })
    return data
  },

  getById: async (id: number) => {
    const { data } = await api.get<Skids>(`/skids/${id}/`)
    return data
  },

  create: async (payload: CreateSkidsPayload) => {
    const { data } = await api.post<Skids>('/skids/', payload)
    return data
  },

  update: async ({ id, payload }: UpdateSkidsPayload) => {
    const { data } = await api.patch<Skids>(`/skids/${id}/`, payload)
    return data
  },

  multiupdate: async (payload: SkidMultiUpdatePayload) => {
    const { data } = await api.post('skids/multi-update/', { ...payload })

    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete<Skids>(`/skids/${id}/`)
    return data
  }
}
