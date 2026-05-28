import { api } from '..'

import type {
  CreateFlowPayload,
  Flow,
  FlowsApiResponse,
  FlowsSearchParams,
  UpdateFlowPayload
} from './schema'

export const flowsService = {
  get: async (params: FlowsSearchParams = {}) => {
    const { data } = await api.get<FlowsApiResponse>('/flows/', { params })
    return data
  },
  create: async (payload: CreateFlowPayload) => {
    const { data } = await api.post<Flow>('/flows/', payload)
    return data
  },
  update: async ({ id, payload }: UpdateFlowPayload) => {
    const { data } = await api.patch<Flow>(`/flows/${id}/`, payload)
    return data
  },
  delete: async (id: number) => {
    const { data } = await api.delete<Flow>(`/flows/${id}/`)
    return data
  }
}
