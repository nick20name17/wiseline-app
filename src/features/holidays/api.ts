import { authApi } from '@/api/client'
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  type QueryClient
} from '@tanstack/react-query'
import * as z from 'zod/mini'

const holidaySchema = z.object({
  id: z.number(),
  date: z.string(),
  name: z.string()
})

const holidaysSchema = z.array(holidaySchema)

export type Holiday = z.infer<typeof holidaySchema>

export const holidayPayloadSchema = z.object({
  date: z.string().check(z.minLength(1, 'Date is required')),
  name: z
    .string()
    .check(z.trim(), z.minLength(1, 'Name is required'), z.maxLength(255, 'At most 255 characters'))
})

export type HolidayPayload = z.infer<typeof holidayPayloadSchema>

export const holidaysKeys = {
  all: ['holidays'] as const,
  list: (year: number) => [...holidaysKeys.all, { year }] as const
}

export const holidaysQuery = (year: number) =>
  queryOptions({
    queryKey: holidaysKeys.list(year),
    // Stepping to another year keeps the table where it is until that year's list is in.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      holidaysSchema.parse(await authApi.get('holidays/', { searchParams: { year } }).json())
  })

/**
 * A holiday closes a day on every department's strip and calendar, queries other features own. Those
 * are not on screen here, so they are only marked stale and read again when a board opens; the one
 * list on screen is refetched. Refetching everything active also re-read the session and the
 * departments, which a holiday does not touch.
 */
const invalidateDays = (client: QueryClient) => {
  void client.invalidateQueries({ refetchType: 'none' })
  return client.invalidateQueries({ queryKey: holidaysKeys.all })
}

export const useUpsertHoliday = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: HolidayPayload }) =>
      id
        ? authApi.patch(`holidays/${id}/`, { json: payload }).json()
        : authApi.post('holidays/', { json: payload }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await invalidateDays(client)
      onSuccess()
    }
  })

export const useDeleteHoliday = () =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`holidays/${id}/`),
    onSuccess: (_, __, ___, { client }) => invalidateDays(client)
  })
