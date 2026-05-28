import type {
  CreateLoadPayload,
  IsLoadedMultiUpdatePayload,
  IsShippedMultiUpdatePayload,
  Load,
  LoadMultiUpdatePayload,
  LoadsResponse,
  LoadsSearchParams,
  RouteLoadMultiUpdatePayload,
  SingleLoad,
  UpdateLoadPayload
} from './schema'
import { api } from '@/api'

export const loadsService = {
  get: async (params: LoadsSearchParams = {}) => {
    const { data } = await api.get<LoadsResponse>('/loads/', { params })
    return data
  },

  getById: async (id: number) => {
    const { data } = await api.get<SingleLoad>(`/loads/${id}/`)
    return data
  },

  create: async (payload: CreateLoadPayload) => {
    const { data } = await api.post<Load>('/loads/', payload)
    return data
  },

  update: async ({ id, payload }: UpdateLoadPayload) => {
    const { data } = await api.patch<Load>(`/loads/${id}/`, payload)
    return data
  },

  multiUpdate: async (payload: LoadMultiUpdatePayload) => {
    const { data } = await api.patch('/loads/multi-update/', { payload })

    return data
  },

  routeMultiUpdate: async ({ id, payload }: RouteLoadMultiUpdatePayload) => {
    const { data } = await api.patch(`/loads/${id}/routes/multi-update/`, payload)

    return data
  },

  isLoadedMultiUpdate: async ({ id, payload }: IsLoadedMultiUpdatePayload) => {
    const { data } = await api.patch(`/loads/${id}/is-loaded/`, payload)

    return data
  },

  isShippedMultiUpdate: async ({ id, payload }: IsShippedMultiUpdatePayload) => {
    const { data } = await api.patch(`/loads/${id}/is-shipped/`, payload)

    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete<Load>(`/loads/${id}/`)
    return data
  }
}
