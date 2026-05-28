import type { OriginItemsApiResponse, OriginItemsSearchParams } from './schema'
import { api } from '@/api'

export const originItemsService = {
  get: async (params: OriginItemsSearchParams = {}) => {
    const { data } = await api.get<OriginItemsApiResponse>('/ebms/items/', { params })
    return data
  }
}
