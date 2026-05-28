import * as z from 'zod/mini'

import type { ModelFile } from '../files/schema'
import { LoadSchema, type ShipmentStatus } from '../loads/schema'
import { LocationSchema } from '../locations/schema'
import type { PackagesItems } from '../packages-items/schema'

import type { ApiResponse, PaginationParams } from '@/api/types'

export const PackageSchema = z.object({
  id: z.number(),
  name: z.string(),
  // quantity: z.number(),
  weight: z.optional(z.number()),
  length: z.optional(z.number()),
  hegith: z.optional(z.number()),
  width: z.optional(z.number()),
  load: z.nullable(LoadSchema),
  dimensions: z.optional(z.string()),
  location: LocationSchema,
  skid_id: z.optional(z.number()),
  order: z.string(),
  order_item: z.string()
})

export const CreatePackageschema = z.omit(PackageSchema, { id: true })

export const UpdatePackageschema = z.object({
  id: z.number(),
  payload: z.partial(CreatePackageschema)
})

export type Package = z.infer<typeof PackageSchema> & {
  is_loaded: boolean
  is_shipped: boolean
  status: ShipmentStatus
  files: ModelFile[]
  package_items: PackagesItems[]
}

export type CreatePackagePayload = z.infer<typeof CreatePackageschema>
export type UpdatePackagePayload = z.infer<typeof UpdatePackageschema>
export type PackagesResponse = ApiResponse<Package>

export type PackagesParams = Partial<
  {
    order: string
    load_id: string
    load_id__isnull: boolean
    load_date: string
    skid_id: string
    skid_id__isnull: boolean
    production_date: string
    truck_id: number
  } & PaginationParams
>

export type MultiUpdatePackagesPayload = {
  ids: number[]
  loads: {
    load_id?: number | null
    skid_id?: number | null
  }
}
