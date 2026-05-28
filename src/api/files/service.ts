import { api } from '..'

import type { FileParams } from './schema'

export const filesService = {
  create: async (payload: FormData, params: FileParams) => {
    const { data } = await api.post<File>('/files/models/', payload, {
      params,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return data
  },
  delete: async (id: number) => {
    const { data } = await api.delete<File>(`/files/models/${id}/`)
    return data
  }
}
