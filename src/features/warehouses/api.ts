import { authApi } from '@/api/client'
import { queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'

// The API declares every field but `id` optional, even `name` and `address`, which the database
// itself requires. The contact block and `color` are not edited here, so they stay out.
const warehouseSchema = z.object({
  id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  address: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  // The board opens the lowest position first, and that is what the spec calls the default
  // warehouse. There is no `is_default` column to lean on — see TODO.md.
  position: z._default(z.number(), 0),
  // Only the count matters: the API refuses to delete a warehouse that still holds locations.
  locations: z._default(z.array(z.object({ id: z.number() })), [])
})

const warehousePageSchema = z.object({
  count: z.number(),
  results: z.array(warehouseSchema)
})

export type Warehouse = z.infer<typeof warehouseSchema>

// The form edits four things; `position` carries the default flag, since the record has none.
export const warehouseFormSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required')),
  address: z._default(z.string(), ''),
  description: z.nullable(z.string()),
  is_default: z.boolean()
})

export type WarehouseForm = z.infer<typeof warehouseFormSchema>

// The board opens the lowest position first, so the default one sits above everything else.
const DEFAULT_POSITION = 1
const REST_POSITION = 2

const toPayload = ({ is_default, ...values }: WarehouseForm) => ({
  ...values,
  position: is_default ? DEFAULT_POSITION : REST_POSITION
})

// One place that builds every warehouses key. The list is a single cache entry, since the search
// narrows it here rather than on the server.
export const warehousesKeys = {
  all: ['warehouses'] as const,
  list: () => [...warehousesKeys.all, 'list'] as const
}

// `GET /warehouses/` pages with `limit`/`offset` and takes no filter, so one page holds the lot.
// A plant has a handful of warehouses; see TODO.md if that ever stops being true.
const PAGE_SIZE = 100

const matches = (warehouse: Warehouse, search: string) =>
  [warehouse.name, warehouse.address, warehouse.description].some(field =>
    field?.toLowerCase().includes(search)
  )

export const warehousesQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: warehousesKeys.list(),
    queryFn: async () =>
      warehousePageSchema.parse(
        await authApi.get('warehouses/', { searchParams: { limit: PAGE_SIZE } }).json()
      ),
    // The endpoint cannot filter, so the search narrows the one cached page instead of refetching.
    select: ({ results }: z.infer<typeof warehousePageSchema>) =>
      search ? results.filter(warehouse => matches(warehouse, search.toLowerCase())) : results
  })

export const useUpsertWarehouse = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, values }: { id?: number; values: WarehouseForm }) =>
      id
        ? authApi.patch(`warehouses/${id}/`, { json: toPayload(values) }).json()
        : authApi.post('warehouses/', { json: toPayload(values) }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: warehousesKeys.all })
      onSuccess()
    }
  })

export const useDeleteWarehouse = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`warehouses/${id}/`),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: warehousesKeys.all })
      onSuccess()
    }
  })
