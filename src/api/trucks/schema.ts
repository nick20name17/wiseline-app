import * as z from 'zod/mini'

import type { PaginationParams } from '../types'

export const TruckSchema = z.object({
  id: z.number(),
  name: z.string().check(z.minLength(1)),
  driver_id: z.coerce.number<number>().check(z.minimum(0)),
  max_weight: z.coerce.number<number>().check(z.minimum(0)),
  max_volume: z.coerce.number<number>().check(z.minimum(0)),
  max_length: z.coerce.number<number>().check(z.minimum(0)),
  max_width: z.coerce.number<number>().check(z.minimum(0)),
  max_height: z.coerce.number<number>().check(z.minimum(0)),
  loads: z.array(
    z.object({
      truck_id: z.number(),
      load_date: z.string(),
      position: z.number(),
      id: z.number()
    })
  )
})

export const CreateTruckSchema = z.omit(TruckSchema, { id: true, loads: true })

export const UpdateTruckSchema = z.object({
  id: z.optional(z.number()),
  payload: CreateTruckSchema
})

export type Truck = z.infer<typeof TruckSchema>
export type CreateTruckPayload = z.infer<typeof CreateTruckSchema>
export type UpdateTruckPayload = z.infer<typeof UpdateTruckSchema>
export type TrucksResponse = Truck[]

export type TrucksSearchParams = Partial<
  {
    search: string
  } & PaginationParams
>
