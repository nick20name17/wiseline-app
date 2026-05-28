import { api } from '..'

import type { Package } from '../packages/schema'

import type {
  MultiCreatePackagesPayload,
  PackagesItemsResponse,
  PackagesItemsSearchParams
} from './schema'

export const packagesItemsService = {
  get: async (params: PackagesItemsSearchParams = {}) => {
    const { data } = await api.get<PackagesItemsResponse>('/packages-items/', { params })
    return data
  },
  // create: async (payload: CreatePackagesItemsPayload) => {
  //   const { data } = await api.post<PackagesItems>('/packages-items/', payload)
  //   return data
  // },
  // update: async ({ id, payload }: UpdatePackagesItemsPayload) => {
  //   const { data } = await api.patch<PackagesItems>(`/packages-items/${id}/`, payload)
  //   return data
  // },

  multicreate: async (payload: MultiCreatePackagesPayload) => {
    const { data } = await api.post<Package>('/packages-items/multi-create/', payload)
    return data
  }

  // delete: async (id: number) => {
  //   const { data } = await api.delete<PackagesItems>(`/packages-items/${id}/`)
  //   return data
  // }
}
