import { authApi } from '@/api/client'
import { keepPreviousData, queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'

// One page holds either list: a plant has tens of locations, not thousands.
const PAGE_SIZE = 200

const departmentSchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  code: z._default(z.string(), ''),
  position: z._default(z.nullable(z.number()), null)
})

export type Department = z.infer<typeof departmentSchema>

/** Same key and shape the boards use, so one copy of the departments is cached for all of them. */
export const departmentsQuery = queryOptions({
  queryKey: ['departments', 'all'] as const,
  queryFn: async () => z.array(departmentSchema).parse(await authApi.get('departments/all/').json())
})

const warehouseSchema = z.object({
  id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  address: z._default(z.nullable(z.string()), null),
  // The lowest one is the default warehouse; see `defaultWarehouseId`.
  position: z._default(z.number(), 0)
})

export type Warehouse = z.infer<typeof warehouseSchema>

/** Just enough of a warehouse to name it in a picker. */
export const warehousePickerQuery = queryOptions({
  queryKey: ['warehouses', 'picker'] as const,
  queryFn: async () =>
    z
      .object({ count: z.number(), results: z.array(warehouseSchema) })
      .parse(await authApi.get('warehouses/', { searchParams: { limit: PAGE_SIZE } }).json()),
  select: (page: { results: Warehouse[] }) => page.results
})

// --- Location types ------------------------------------------------------

const locationTypeSchema = z.object({
  id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  warehouse_id: z._default(z.nullable(z.number()), null),
  // A location's department follows from its type, which is the only place it is set.
  department_id: z._default(z.nullable(z.number()), null),
  description: z._default(z.nullable(z.string()), null),
  position: z._default(z.nullable(z.number()), null)
})

export type LocationType = z.infer<typeof locationTypeSchema>

export const locationTypeFormSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required')),
  warehouse_id: z.number(),
  department_id: z.number(),
  description: z.nullable(z.string())
})

export type LocationTypeForm = z.infer<typeof locationTypeFormSchema>

export const locationsKeys = {
  all: ['locations'] as const,
  types: (search: string | undefined) =>
    [...locationsKeys.all, 'types', { search: search ?? '' }] as const,
  typesAll: () => [...locationsKeys.all, 'types', 'all'] as const,
  list: (search: string | undefined) =>
    [...locationsKeys.all, 'list', { search: search ?? '' }] as const
}

export const locationTypesQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: locationsKeys.types(search),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      z.object({ count: z.number(), results: z.array(locationTypeSchema) }).parse(
        await authApi
          .get('location-types/', {
            searchParams: { limit: PAGE_SIZE, ...(search ? { search } : {}) }
          })
          .json()
      )
  })

/** The unpaginated list a location's own form picks from. */
export const allLocationTypesQuery = queryOptions({
  queryKey: locationsKeys.typesAll(),
  queryFn: async () =>
    z.array(locationTypeSchema).parse(await authApi.get('location-types/all/').json())
})

export const useUpsertLocationType = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, values }: { id?: number; values: LocationTypeForm }) =>
      id
        ? authApi.patch(`location-types/${id}/`, { json: values }).json()
        : authApi.post('location-types/', { json: values }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: locationsKeys.all })
      onSuccess()
    }
  })

export const useDeleteLocationType = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`location-types/${id}/`),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: locationsKeys.all })
      onSuccess()
    }
  })

// --- Locations -----------------------------------------------------------

const locationSchema = z.object({
  id: z.number(),
  // The code is the name the floor reads off the label: «101», «B12».
  code: z._default(z.nullable(z.string()), null),
  position: z._default(z.nullable(z.number()), null),
  warehouse_id: z._default(z.nullable(z.number()), null),
  location_type_id: z._default(z.nullable(z.number()), null),
  weight: z._default(z.nullable(z.number()), null),
  description: z._default(z.nullable(z.string()), null),
  // A location that takes more than one order at a time, and how many.
  multi_order: z._default(z.boolean(), false),
  max_orders: z._default(z.nullable(z.number()), null)
})

export type Location = z.infer<typeof locationSchema>

// A picker starts on nothing, as the design has it, so an untouched one reads as null until chosen.
const picked = (message: string) =>
  z.nullable(z.number()).check(z.refine(value => value !== null, message))

export const locationFormSchema = z.object({
  code: z.string().check(z.minLength(1, 'Name is required')),
  warehouse_id: picked('Warehouse is required'),
  location_type_id: picked('Location Type is required'),
  weight: z.number('Max weight is required'),
  description: z.nullable(z.string()),
  multi_order: z.boolean(),
  max_orders: z.nullable(z.number())
})

export type LocationForm = z.infer<typeof locationFormSchema>

export const locationsQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: locationsKeys.list(search),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      z.object({ count: z.number(), results: z.array(locationSchema) }).parse(
        await authApi
          .get('locations/', {
            searchParams: { limit: PAGE_SIZE, ...(search ? { search } : {}) }
          })
          .json()
      )
  })

export const useUpsertLocation = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, values }: { id?: number; values: LocationForm }) =>
      id
        ? authApi.patch(`locations/${id}/`, { json: values }).json()
        : authApi.post('locations/', { json: values }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: locationsKeys.all })
      onSuccess()
    }
  })

export const useDeleteLocation = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`locations/${id}/`),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: locationsKeys.all })
      onSuccess()
    }
  })
