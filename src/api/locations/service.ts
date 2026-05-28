import type {
  CreateLocationsPayload,
  Location,
  LocationsSearchParams,
  LocationssResponse,
  UpdateLocationsPayload
} from './schema'
import { api } from '@/api'

export const locationsService = {
  get: async (params: LocationsSearchParams = {}) => {
    const { data } = await api.get<LocationssResponse>('/locations/', { params })
    return data
  },

  create: async (payload: CreateLocationsPayload) => {
    const { data } = await api.post<Location>('/locations/', payload)
    return data
  },

  update: async ({ id, payload }: UpdateLocationsPayload) => {
    const { data } = await api.patch<Location>(`/locations/${id}/`, payload)
    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete<Location>(`/locations/${id}/`)
    return data
  }
}
