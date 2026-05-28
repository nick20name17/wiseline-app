import { api } from '..'

import type { CreateCommentPayload, UpdateCommentPayload } from './schema'

export const commentsService = {
  create: async (payload: CreateCommentPayload) => {
    const { data } = await api.post<Comment>('/comments/', payload)
    return data
  },
  update: async ({ id, payload }: UpdateCommentPayload) => {
    const { data } = await api.patch<Comment>(`/comments/${id}/`, payload)
    return data
  }
}
