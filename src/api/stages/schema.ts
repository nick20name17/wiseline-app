import * as z from 'zod/mini'

import type { PaginationParams } from '../types'

import type { ApiResponse } from '@/api/types'

export const StageSchema = z.object({
  name: z.string().check(z.minLength(1)),
  description: z.optional(z.string()),
  position: z.number(),
  default: z.boolean(),
  color: z.string().check(z.minLength(1)),
  flow: z.number(),
  id: z.number()
})

export const CreateStageSchema = z.omit(StageSchema, { id: true })

export const UpdateStageSchema = z.object({
  id: z.optional(z.number()),
  payload: CreateStageSchema
})

export type Stage = z.infer<typeof StageSchema>
export type CreateStagePayload = z.infer<typeof CreateStageSchema>
export type UpdateStagePayload = z.infer<typeof UpdateStageSchema>
export type StagesApiResponse = ApiResponse<Stage>

export type StagesSearchParams = Partial<{} & PaginationParams>
