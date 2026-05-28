import type {
  CreateTruckPayload,
  Truck,
  TrucksResponse,
  TrucksSearchParams,
  UpdateTruckPayload
} from './schema'
import { api } from '@/api'

export const trucksService = {
  get: async (params: TrucksSearchParams = {}) => {
    const { data } = await api.get<TrucksResponse>('/trucks/', { params })
    return data
  },

  getById: async (id: number) => {
    const { data } = await api.get<Truck>(`/trucks/${id}/`)
    return data
  },

  create: async (payload: CreateTruckPayload) => {
    const { data } = await api.post<Truck>('/trucks/', payload)
    return data
  },

  update: async ({ id, payload }: UpdateTruckPayload) => {
    const { data } = await api.patch<Truck>(`/trucks/${id}/`, payload)
    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete<Truck>(`/trucks/${id}/`)
    return data
  }
}
