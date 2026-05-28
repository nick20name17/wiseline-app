import * as z from 'zod/mini'

import type { Package } from '../packages/schema'
import type { LoadRoute } from '../routes/schema'
import type { Skids } from '../skids/schema'
import { TruckSchema } from '../trucks/schema'
import type { PaginationParams } from '../types'

import type { ApiResponse } from '@/api/types'

export const ShipmentStatusEnum = z.union([
  z.enum(['loading', 'loaded', 'shipping', 'shipped']),
  z.null()
])

export type ShipmentStatus = z.infer<typeof ShipmentStatusEnum>

export const LoadSchema = z.object({
  id: z.number(),
  truck_id: z.number(),
  truck: TruckSchema,
  load_date: z.string(),
  weight: z.optional(z.number()),
  width: z.optional(z.number()),
  length: z.optional(z.number()),
  status: ShipmentStatusEnum,
  is_delivered: z.optional(z.boolean()),
  position: z.number().check(z.minimum(1)),
  ready_to_load: z.optional(z.boolean()),
  is_loaded: z.optional(z.boolean()),
  is_shipped: z.optional(z.boolean()),
  road_confirmed: z.optional(z.boolean())
})

export const CreateLoadSchema = z.omit(LoadSchema, { id: true, truck: true })

export const UpdateLoadSchema = z.object({
  id: z.number(),
  payload: z.partial(CreateLoadSchema)
})

export type Load = z.infer<typeof LoadSchema>
export type SingleLoad = Load & {
  packages: Package[]
  skids: Skids[]
  routes: LoadRoute[]
}
export type CreateLoadPayload = z.infer<typeof CreateLoadSchema>
export type UpdateLoadPayload = z.infer<typeof UpdateLoadSchema>
export type LoadsResponse = ApiResponse<Load>

export interface LoadMultiUpdatePayload {
  ids: number[]
  load: Partial<{
    truck_id: number
    load_date: string
    position: number
    weight: number
    width: number
    length: number
    ready_to_load: boolean
    is_loaded: boolean
    road_confirmed: boolean
  }>
}

export type RouteLoadMultiUpdatePayload = {
  id: number
  payload: Partial<Omit<LoadRoute, 'id'>>[]
}
export type IsLoadedMultiUpdatePayload = {
  id: number
  payload: {
    is_loaded: boolean
    skids: number[]
    packages: number[]
  }
}

export type IsShippedMultiUpdatePayload = {
  id: number
  payload: {
    is_shipped: boolean
    skids?: number[]
    packages?: number[]
  }
}

export type LoadsSearchParams = Partial<
  {
    truck_id: number
    is_loaded: boolean
    ready_to_load: boolean
    load_date: string
  } & PaginationParams
>
