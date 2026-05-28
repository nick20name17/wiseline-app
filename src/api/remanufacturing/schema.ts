import * as z from 'zod/mini'

import { OriginItemStatusSchema } from '../items/schema'

import type { ApiResponse } from '@/api/types'

export const RemanufacturingQtySchema = z.object({
  remanufacturing_qty: z.coerce.number<number>().check(z.minimum(0)),
  pull_from_stock_qty: z.coerce.number<number>().check(z.minimum(0))
})

export const RemanufacturingSchema = z.object({
  id: z.number(),
  name: z.string(),
  ...RemanufacturingQtySchema.shape,
  note: z.optional(z.string()),
  status: OriginItemStatusSchema,
  order: z.string(),
  origin_item: z.string(),
  created_at: z.string(),
  created_by: z.number()
})

export const CreateRemanufacturingSchema = z.pick(RemanufacturingSchema, {
  remanufacturing_qty: true,
  pull_from_stock_qty: true,
  note: true,
  status: true,
  order: true,
  origin_item: true
})

export const UpdateRemanufacturingSchema = z.object({
  autoid: z.nullish(z.string()),
  status: OriginItemStatusSchema,
  payload: CreateRemanufacturingSchema
})

export type Remanufacturing = z.infer<typeof RemanufacturingSchema>
export type CreateRemanufacturingPayload = z.infer<typeof CreateRemanufacturingSchema>
export type RemanufacturingQtyPayload = z.infer<typeof RemanufacturingQtySchema>
export type UpdateRemanufacturingPayload = z.infer<typeof UpdateRemanufacturingSchema>
export type RemanufacturingsResponse = ApiResponse<Remanufacturing>
