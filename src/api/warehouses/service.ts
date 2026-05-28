import type {
  CreateWarehousesPayload,
  UpdateWarehousesPayload,
  Warehouse,
  WarehousesSearchParams,
  WarehousessResponse
} from './schema'
import { api } from '@/api'

export const warehousesService = {
  get: async (params: WarehousesSearchParams = {}) => {
    const { data } = await api.get<WarehousessResponse>('/warehouses/', { params })
    return data
  },

  create: async (payload: CreateWarehousesPayload) => {
    const { data } = await api.post<Warehouse>('/warehouses/', payload)
    return data
  },

  update: async ({ id, payload }: UpdateWarehousesPayload) => {
    const { data } = await api.patch<Warehouse>(`/warehouses/${id}/`, payload)
    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete<Warehouse>(`/warehouses/${id}/`)
    return data
  }
}
