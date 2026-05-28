import * as z from 'zod/mini'

import { LocationSchema } from '../locations/schema'
import type { PaginationParams } from '../types'

import type { ApiResponse } from '@/api/types'

export const WarehouseSchema = z.object({
  id: z.number(),
  name: z.string().check(z.minLength(1, 'Required')),
  address: z.string().check(z.minLength(1, 'Required')),
  description: z.optional(z.string()),
  code: z.string().check(z.minLength(1)),
  position: z.coerce.number<number>().check(z.minimum(1)),
  color: z.optional(z.string()),
  locations: z.array(LocationSchema)
})

export const CreateWarehousesSchema = z.omit(WarehouseSchema, { id: true, locations: true })

export const UpdateWarehousesSchema = z.object({
  id: z.optional(z.number()),
  payload: CreateWarehousesSchema
})

export type Warehouse = z.infer<typeof WarehouseSchema>
export type CreateWarehousesPayload = z.infer<typeof CreateWarehousesSchema>
export type UpdateWarehousesPayload = z.infer<typeof UpdateWarehousesSchema>
export type WarehousessResponse = ApiResponse<Warehouse>

export type WarehousesSearchParams = Partial<
  {
    search: string
  } & PaginationParams
>
