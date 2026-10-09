import { authApi } from '@/api/client'
import { keepPreviousData, queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'

// A truck can be created with nothing but a name and have its weight filled in later. The record
// carries more — the driver, the notes, the other four measurements — but nothing here reads them.
const truckSchema = z.object({
  id: z.number(),
  name: z.string(),
  plate: z._default(z.nullable(z.string()), null),
  max_weight: z._default(z.nullable(z.number()), null)
})

const trucksSchema = z.array(truckSchema)

export type Truck = z.infer<typeof truckSchema>

export const truckPayloadSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required')),
  plate: z.nullable(z.string().check(z.maxLength(32, 'At most 32 characters'))),
  max_weight: z.nullable(z.number().check(z.minimum(0, 'Must be zero or more')))
})

export type TruckPayload = z.infer<typeof truckPayloadSchema>

export const trucksKeys = {
  all: ['trucks'] as const,
  list: (search: string | undefined) => [...trucksKeys.all, { search: search ?? '' }] as const
}

export const trucksQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: trucksKeys.list(search),
    // Each search term is its own cache entry, so without this the table would fall back to the
    // skeleton on every keystroke pause and resize itself twice per search.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      trucksSchema.parse(
        await authApi.get('trucks/', { searchParams: search ? { search } : {} }).json()
      )
  })

export const useUpsertTruck = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: TruckPayload }) =>
      id
        ? authApi.patch(`trucks/${id}/`, { json: payload }).json()
        : authApi.post('trucks/', { json: payload }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trucksKeys.all })
      onSuccess()
    }
  })

export const useDeleteTruck = () =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`trucks/${id}/`),
    onSuccess: (_, __, ___, { client }) => client.invalidateQueries({ queryKey: trucksKeys.all })
  })
