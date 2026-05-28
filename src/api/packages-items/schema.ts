import * as z from 'zod/mini'

import type { OriginItem } from '../origin-items/schema'

import type { ApiResponse, PaginationParams } from '@/api/types'

export const CreatePackagesItemsSchema = z.object({
  quantity: z.number(),
  weight: z.optional(z.number()),
  dimensions: z.optional(z.string()),
  location_id: z.number(),
  skid_id: z.optional(z.number()),
  package_id: z.optional(z.number()),
  load_id: z.optional(z.number()),
  width: z.optional(z.number()),
  height: z.optional(z.number()),
  order: z.string(),
  order_item: z.string()
})

export const UpdatePackagesItemsSchema = z.object({
  id: z.number(),
  payload: z.partial(CreatePackagesItemsSchema)
})

export interface PackagesItems {
  id: number
  quantity: number
  weight: number
  dimensions: string
  location_id: number
  skid_id: number
  package_id: number
  is_loaded: boolean
  load_id: number
  width: number
  height: number
  order: string
  order_item: string
  origin_item: OriginItem
}
export type CreatePackagesItemsPayload = z.infer<typeof CreatePackagesItemsSchema>
export type UpdatePackagesItemsPayload = z.infer<typeof UpdatePackagesItemsSchema>
export type PackagesItemsResponse = ApiResponse<PackagesItems>

export type PackagesItemsSearchParams = Partial<
  {
    order: string
    load_id: string
    load_id__isnull: boolean
    production_date: string
    truck_id: number
  } & PaginationParams
>

export interface MultiUpdatePackagesItemsPayload {
  ids: number[]
  loads: {
    load_id: number | null
  }
}

export interface MultiCreatePackagesPayload {
  location_id: number
  package_items: {
    order: string
    order_item: string
    quantity: number
    wrapped_from_stock: number
    wrapped_from_production: number
  }[]
}
