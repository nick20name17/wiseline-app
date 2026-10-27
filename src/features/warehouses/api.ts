import { authApi } from '@/api/client'
import { keepPreviousData, queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'

// The API declares every field but `id` optional, even `name` and `address`, which the database
// itself requires. The contact block and `color` are not edited here, so they stay out.
const warehouseSchema = z.object({
  id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  address: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  // Exclusive across the table: marking one clears the one before.
  is_default: z._default(z.boolean(), false),
  // Only the count matters: the API refuses to delete a warehouse that still holds locations.
  locations: z._default(z.array(z.object({ id: z.number() })), [])
})

const warehousePageSchema = z.object({
  count: z.number(),
  results: z.array(warehouseSchema)
})

export type Warehouse = z.infer<typeof warehouseSchema>

export const warehouseFormSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required')),
  address: z._default(z.string(), ''),
  description: z.nullable(z.string()),
  is_default: z.boolean()
})

export type WarehouseForm = z.infer<typeof warehouseFormSchema>

export const warehousesKeys = {
  all: ['warehouses'] as const,
  list: (search: string | undefined) => [...warehousesKeys.all, 'list', search ?? ''] as const
}

// A plant has a handful of warehouses, so one page holds them.
const PAGE_SIZE = 100

export const warehousesQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: warehousesKeys.list(search),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      warehousePageSchema.parse(
        await authApi
          .get('warehouses/', {
            searchParams: { limit: PAGE_SIZE, ...(search ? { search } : {}) }
          })
          .json()
      ).results
  })

export const useUpsertWarehouse = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, values }: { id?: number; values: WarehouseForm }) =>
      id
        ? authApi.patch(`warehouses/${id}/`, { json: values }).json()
        : authApi.post('warehouses/', { json: values }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: warehousesKeys.all })
      onSuccess()
    }
  })

export const useDeleteWarehouse = () =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`warehouses/${id}/`),
    onSuccess: (_, __, ___, { client }) =>
      client.invalidateQueries({ queryKey: warehousesKeys.all })
  })
