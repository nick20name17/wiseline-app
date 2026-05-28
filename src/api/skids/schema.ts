import * as z from 'zod/mini'

import type { ModelFile } from '../files/schema'
import type { Load, ShipmentStatus } from '../loads/schema'
import { type Package } from '../packages/schema'

import type { ApiResponse, PaginationParams } from '@/api/types'

export const SkidsSchema = z.object({
  id: z.number(),
  quantity: z.number(),
  weight: z.optional(z.number()),
  width: z.optional(z.number()),
  load_id: z.number(),
  height: z.optional(z.number()),
  length: z.optional(z.number()),
  dimensions: z.optional(z.string()),
  location_id: z.optional(z.number()),
  is_loaded: z.optional(z.boolean()),
  is_shipped: z.optional(z.boolean()),
  order: z.optional(z.string()),
  order_item: z.optional(z.string())
})

export const CreateSkidsSchema = z.omit(SkidsSchema, { id: true })

export const UpdateSkidsSchema = z.object({
  id: z.number(),
  payload: z.partial(CreateSkidsSchema)
})

export type Skids = z.infer<typeof SkidsSchema> & {
  packages: Package[]
  files: ModelFile[]
  status: ShipmentStatus

  load: Load
}
export type CreateSkidsPayload = z.infer<typeof CreateSkidsSchema>
export type UpdateSkidsPayload = z.infer<typeof UpdateSkidsSchema>
export type SkidsResponse = ApiResponse<Skids>

export interface SkidMultiUpdatePayload {
  skids: number[]
  loads: {
    load_id?: number | null
  }
}

export type SkidParams = Partial<
  {
    load_id: string
  } & PaginationParams
>
