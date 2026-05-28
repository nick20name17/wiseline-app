import * as z from 'zod/mini'

import type { PaginationParams } from '../types'

import type { ApiResponse } from '@/api/types'

export const LocationSchema = z.object({
  id: z.number(),
  code: z.string().check(z.minLength(1, 'Required')),
  position: z.coerce.number<number>().check(z.minimum(1)),
  warehouse_id: z.number(),
  // TODO: add proper warehouse schema
  warehouse: z.object({
    id: z.number(),
    name: z.string().check(z.minLength(1)),
    address: z.string().check(z.minLength(1)),
    description: z.optional(z.string()),
    code: z.string().check(z.minLength(1)),
    position: z.coerce.number<number>().check(z.minimum(1)),
    color: z.optional(z.string())
  }),
  weight: z.coerce.number<number>(),
  dimensions: z.optional(z.string())
})

export const CreateLocationsSchema = z.extend(
  z.omit(LocationSchema, { id: true, warehouse: true, dimensions: true }),
  {
    warehouse_id: z.number()
  }
)

export const UpdateLocationsSchema = z.object({
  id: z.optional(z.number()),
  payload: CreateLocationsSchema
})

export type Location = z.infer<typeof LocationSchema>
export type CreateLocationsPayload = z.infer<typeof CreateLocationsSchema>
export type UpdateLocationsPayload = z.infer<typeof UpdateLocationsSchema>
export type LocationssResponse = ApiResponse<Location>

export type LocationsSearchParams = Partial<
  {
    search: string
  } & PaginationParams
>
