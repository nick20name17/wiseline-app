import * as z from 'zod/mini'

import { OriginItemStatusSchema } from '../items/schema'
import { StageSchema } from '../stages/schema'
import type { PaginationParams } from '../types'

import type { ApiResponse } from '@/api/types'

export const FlowSchema = z.object({
  id: z.number(),
  name: z.string().check(z.minLength(1, 'Required')),
  description: z.optional(z.string()),
  position: z.number(),
  color: z.string().check(z.minLength(1)),
  next_status: OriginItemStatusSchema,
  created_at: z.string(),
  category: z.string(),
  stages: z.array(StageSchema).check(z.minLength(0))
})

export const CreateFlowSchema = z.pick(FlowSchema, {
  name: true,
  description: true
})

export const UpdateFlowSchema = z.object({
  id: z.optional(z.number()),
  payload: z.object({
    ...CreateFlowSchema.shape,
    category: z.string()
  })
})

export type Flow = z.infer<typeof FlowSchema>
export type CreateFlowPayload = z.infer<typeof CreateFlowSchema> & { category: string }
export type UpdateFlowPayload = z.infer<typeof UpdateFlowSchema>
export type FlowssResponse = ApiResponse<Flow>

export type FlowsSearchParams = Partial<
  {
    category__prod_type: string
  } & PaginationParams
>

export type FlowsApiResponse = ApiResponse<Flow>
