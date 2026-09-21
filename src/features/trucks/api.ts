import { authApi } from '@/api/client'
import { queryClient } from '@/lib/query-client'
import { keepPreviousData, queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'

// Only `id` and `name` are guaranteed by the API: a truck can be created with nothing but a name
// and have its measurements filled in later.
const optionalNumber = z._default(z.nullable(z.number()), null)

const truckSchema = z.object({
  id: z.number(),
  name: z.string(),
  driver_id: optionalNumber,
  notes: z._default(z.nullable(z.string()), null),
  max_weight: optionalNumber,
  max_volume: optionalNumber,
  max_length: optionalNumber,
  max_width: optionalNumber,
  max_height: optionalNumber
})

const trucksSchema = z.array(truckSchema)

export type Truck = z.infer<typeof truckSchema>

const measurement = z.nullable(z.number().check(z.minimum(0, 'Must be zero or more')))

export const truckPayloadSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required')),
  driver_id: z.nullable(z.number()),
  max_weight: measurement,
  max_volume: measurement,
  max_length: measurement,
  max_width: measurement,
  max_height: measurement
})

export type TruckPayload = z.infer<typeof truckPayloadSchema>

const TRUCKS_KEY = ['trucks'] as const

export const trucksQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: [...TRUCKS_KEY, { search: search ?? '' }],
    // Each search term is its own cache entry, so without this the table would fall back to the
    // skeleton on every keystroke pause and resize itself twice per search.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      trucksSchema.parse(
        await authApi.get('trucks/', { searchParams: search ? { search } : {} }).json()
      )
  })

// Drivers are users, but there is no users feature yet; move this out when one lands.
const userSchema = z.object({
  id: z.number(),
  first_name: z._default(z.string(), ''),
  last_name: z._default(z.string(), ''),
  role: z.string()
})

type User = z.infer<typeof userSchema>

// `users/all/` takes no parameters and `users/` only paginates, so the API cannot narrow by role.
// Caching the whole list and narrowing with `select` at least keeps it to one request no matter
// how many roles the app ends up asking for.
const usersQuery = {
  queryKey: ['users', 'all'],
  queryFn: async () => z.array(userSchema).parse(await authApi.get('users/all/').json())
}

export const driversQuery = queryOptions({
  ...usersQuery,
  select: (users: User[]) => users.filter(user => user.role === 'driver')
})

const invalidateTrucks = () => queryClient.invalidateQueries({ queryKey: TRUCKS_KEY })

export const useUpsertTruck = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: TruckPayload }) =>
      id
        ? authApi.patch(`trucks/${id}/`, { json: payload }).json()
        : authApi.post('trucks/', { json: payload }).json(),
    onSuccess: async () => {
      await invalidateTrucks()
      onSuccess()
    }
  })

export const useDeleteTruck = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`trucks/${id}/`),
    onSuccess: async () => {
      await invalidateTrucks()
      onSuccess()
    }
  })
