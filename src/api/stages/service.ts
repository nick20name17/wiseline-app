import { api } from '..'

import type {
  CreateStagePayload,
  Stage,
  StagesApiResponse,
  StagesSearchParams,
  UpdateStagePayload
} from './schema'

export const stagesService = {
  get: async (params: StagesSearchParams = {}) => {
    const { data } = await api.get<StagesApiResponse>('/stages/', { params })
    return data
  },
  create: async (payload: CreateStagePayload) => {
    const { data } = await api.post<Stage>('/stages/', payload)
    return data
  },
  update: async ({ id, payload }: UpdateStagePayload) => {
    const { data } = await api.patch<Stage>(`/stages/${id}/`, payload)
    return data
  },
  delete: async (id: number) => {
    const { data } = await api.delete<Stage>(`/stages/${id}/`)
    return data
  }
}
