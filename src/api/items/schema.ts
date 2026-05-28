import * as z from 'zod/mini'

import type { Item } from '../origin-items/schema'

import type { ApiResponse } from '@/api/types'

export const ORIGIN_ITEM_STATUS_OPTIONS = ['cut', 'bent', 'wrapped', 'stock', 'shipped'] as const

export const OriginItemStatusSchema = z.union([z.enum(ORIGIN_ITEM_STATUS_OPTIONS), z.null()])

export const CreateItemsSchema = z.object({
  order: z.string(),
  origin_item: z.string().check(z.minLength(1)),
  flow: z.optional(z.number()),
  production_date: z.optional(z.string()),
  time: z.optional(z.string()),
  packages: z.optional(z.number()),
  location: z.optional(z.number()),
  stage: z.optional(z.number()),
  status: z.optional(OriginItemStatusSchema),
  statuses: z.optional(z.array(OriginItemStatusSchema)),
  pull_from_stock: z.optional(z.number()),
  wrapped_from_stock: z.optional(z.number()),
  wrapped_from_production: z.optional(z.number())
})

export const UpdateItemsSchema = z.object({
  id: z.nullish(z.number()),
  payload: CreateItemsSchema
})

export type OriginItemStatus = z.infer<typeof OriginItemStatusSchema>

export type CreateItemsPayload = z.infer<typeof CreateItemsSchema>
export type UpdateItemsPayload = z.infer<typeof UpdateItemsSchema>
export type ItemssResponse = ApiResponse<Item>
