import type {
  CreateRemanufacturingPayload,
  Remanufacturing,
  RemanufacturingsResponse,
  UpdateRemanufacturingPayload
} from './schema'
import { api } from '@/api'

export const remanufacturingService = {
  get: async () => {
    const { data } = await api.get<RemanufacturingsResponse>('/remanufacturings/')
    return data
  },

  create: async (payload: CreateRemanufacturingPayload) => {
    const { data } = await api.post<Remanufacturing>('/remanufacturings/', payload)
    return data
  },

  update: async ({ autoid, status, payload }: UpdateRemanufacturingPayload) => {
    const { data } = await api.patch<Remanufacturing>(
      `/remanufacturings/${status}/${autoid}/`,
      payload
    )
    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete<Remanufacturing>(`/remanufacturings/${id}/`)
    return data
  }
}
