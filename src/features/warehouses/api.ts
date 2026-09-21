import { authApi } from '@/api/client'
import { queryClient } from '@/lib/query-client'
import { queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'

// The API declares every field but `id` optional, even `name` and `address`, which the database
// itself requires. Nothing else on the record — the contact block, `code`, `position`, `color` —
// is edited here, so it stays out of the schema.
const warehouseSchema = z.object({
  id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  address: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  // Only the count matters: the API refuses to delete a warehouse that still holds locations.
  locations: z._default(z.array(z.object({ id: z.number() })), [])
})

const warehousePageSchema = z.object({
  count: z.number(),
  results: z.array(warehouseSchema)
})

export type Warehouse = z.infer<typeof warehouseSchema>

export const warehousePayloadSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required')),
  address: z.string().check(z.minLength(1, 'Address is required')),
  description: z.nullable(z.string())
})

export type WarehousePayload = z.infer<typeof warehousePayloadSchema>

const WAREHOUSES_KEY = ['warehouses'] as const

// `GET /warehouses/` pages with `limit`/`offset` and takes no filter, so one page holds the lot.
// A plant has a handful of warehouses; see TODO.md if that ever stops being true.
const PAGE_SIZE = 100

const matches = (warehouse: Warehouse, search: string) =>
  [warehouse.name, warehouse.address, warehouse.description].some(field =>
    field?.toLowerCase().includes(search)
  )

export const warehousesQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: WAREHOUSES_KEY,
    queryFn: async () =>
      warehousePageSchema.parse(
        await authApi.get('warehouses/', { searchParams: { limit: PAGE_SIZE } }).json()
      ),
    // The endpoint cannot filter, so the search narrows the one cached page instead of refetching.
    select: ({ results }: z.infer<typeof warehousePageSchema>) =>
      search ? results.filter(warehouse => matches(warehouse, search.toLowerCase())) : results
  })

const invalidateWarehouses = () => queryClient.invalidateQueries({ queryKey: WAREHOUSES_KEY })

export const useUpsertWarehouse = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: WarehousePayload }) =>
      id
        ? authApi.patch(`warehouses/${id}/`, { json: payload }).json()
        : authApi.post('warehouses/', { json: payload }).json(),
    onSuccess: async () => {
      await invalidateWarehouses()
      onSuccess()
    }
  })

export const useDeleteWarehouse = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`warehouses/${id}/`),
    onSuccess: async () => {
      await invalidateWarehouses()
      onSuccess()
    }
  })
