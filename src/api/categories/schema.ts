import * as z from 'zod/mini'

import { FlowSchema } from '../flows/schema'
import { ProductionTypeSchema } from '../users/schema'

import type { ApiResponse } from '@/api/types'

export const CategorySchema = z.object({
  id: z.string(),
  name: ProductionTypeSchema,
  capacity: z.number(),
  capacity_id: z.number(),
  total_capacity: z.string(),
  flow_count: z.number(),
  flows: z.array(FlowSchema)
})

export type Category = z.infer<typeof CategorySchema>

export type CategoriessResponse = ApiResponse<Category>
