import * as z from 'zod/mini'

import type { ApiResponse } from '@/api/types'

export const CommentSchema = z.object({
  id: z.number(),
  text: z.string().check(z.minLength(1)),
  user: z.number(),
  item: z.string(),
  creadted_at: z.string()
})

export const CreateCommentSchema = z.pick(CommentSchema, { text: true, user: true, item: true })

export const UpdateCommentSchema = z.object({
  id: z.optional(z.number()),
  payload: CreateCommentSchema
})

export type Comment = z.infer<typeof CommentSchema>
export type CreateCommentPayload = z.infer<typeof CreateCommentSchema>
export type UpdateCommentPayload = z.infer<typeof UpdateCommentSchema>
export type CommentsApiResponse = ApiResponse<Comment>
