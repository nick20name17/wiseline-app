import type {
  CreatePackagePayload,
  MultiUpdatePackagesPayload,
  Package,
  PackagesParams,
  PackagesResponse,
  UpdatePackagePayload
} from './schema'
import { api } from '@/api'

export const packageService = {
  get: async (params: PackagesParams = {}) => {
    const { data } = await api.get<PackagesResponse>('/packages/', { params })
    return data
  },

  getById: async (id: number) => {
    const { data } = await api.get<Package>(`/packages/${id}/`)

    return data
  },

  create: async (payload: CreatePackagePayload) => {
    const { data } = await api.post<Package>('/packages/', payload)
    return data
  },

  update: async ({ id, payload }: UpdatePackagePayload) => {
    const { data } = await api.patch<Package>(`/packages/${id}/`, payload)
    return data
  },

  multiupdate: async (payload: MultiUpdatePackagesPayload) => {
    const { data } = await api.post<unknown>('/packages/multi-update/', payload)
    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete<Package>(`/packages/${id}/`)
    return data
  }
}
