import type { Item } from '../origin-items/schema'

import type { CreateItemsPayload, ItemssResponse, UpdateItemsPayload } from './schema'
import { api } from '@/api'

export const itemsService = {
  get: async () => {
    const { data } = await api.get<ItemssResponse>('/items/')
    return data
  },

  create: async (payload: CreateItemsPayload) => {
    const { data } = await api.post<Item>('/items/', payload)
    return data
  },

  update: async ({ id, payload }: UpdateItemsPayload) => {
    const { data } = await api.patch<Item>(`/items/${id}/`, payload)
    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete<Item>(`/items/${id}/`)
    return data
  }
}
