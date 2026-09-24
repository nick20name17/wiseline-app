import { authApi } from '@/api/client'
import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useMutation
} from '@tanstack/react-query'
import * as z from 'zod/mini'

const departmentSchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  code: z._default(z.string(), ''),
  position: z._default(z.nullable(z.number()), null),
  // lb; `null` is no ceiling. Trim's schema reads it too, and whichever fetches first fills the
  // shared cache, so every copy of this schema has to keep it.
  max_package_weight: z._default(z.nullable(z.number()), null)
})

export type Department = z.infer<typeof departmentSchema>

// The server refuses 0 or less (gt=0), so the form does too. `null` takes the ceiling off.
export const maxPackageWeightFormSchema = z.object({
  max_package_weight: z.nullable(
    z.number({ error: 'Enter a weight above 0' }).check(z.positive('Enter a weight above 0'))
  )
})

export type MaxPackageWeightForm = z.infer<typeof maxPackageWeightFormSchema>

/** Same key and shape the boards use, so one copy of the departments is cached for all of them. */
export const departmentsQuery = queryOptions({
  queryKey: ['departments', 'all'] as const,
  queryFn: async () => z.array(departmentSchema).parse(await authApi.get('departments/all/').json())
})

/**
 * What a machine does inside its department, which decides how it is listed and which statuses its
 * rows can reach. The server owns the list; these are the ones a department can hold.
 */
export const MACHINE_KINDS = [
  'cutting',
  'bending',
  'rollforming',
  'slit_line',
  'wrapping',
  'packaging'
] as const

export type MachineKind = (typeof MACHINE_KINDS)[number]

export const KIND_LABELS: Record<MachineKind, string> = {
  cutting: 'Cutting',
  bending: 'Bending',
  rollforming: 'Rollforming',
  slit_line: 'Slit line',
  wrapping: 'Wrapping',
  packaging: 'Packaging'
}

const machineSchema = z.object({
  id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  position: z._default(z.nullable(z.number()), null),
  // The EBMS category that routes work to this machine's department.
  category: z._default(z.nullable(z.string()), null),
  department: z._default(z.nullable(z.number()), null),
  kind: z._default(z.nullable(z.string()), null),
  daily_max_pieces: z._default(z.nullable(z.number()), null),
  daily_max_bends: z._default(z.nullable(z.number()), null)
})

export type Machine = z.infer<typeof machineSchema>

export const machineFormSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required')),
  category: z.string().check(z.minLength(1, 'Category is required')),
  department: z.number(),
  kind: z.string(),
  daily_max_pieces: z.nullable(z.number()),
  daily_max_bends: z.nullable(z.number())
})

export type MachineForm = z.infer<typeof machineFormSchema>

const categorySchema = z.object({
  id: z._default(z.string(), ''),
  name: z._default(z.nullable(z.string()), null)
})

export type Category = z.infer<typeof categorySchema>

export const machinesKeys = {
  all: ['machines'] as const,
  list: () => [...machinesKeys.all, 'list'] as const,
  categories: () => [...machinesKeys.all, 'categories'] as const
}

export const machinesQuery = queryOptions({
  queryKey: machinesKeys.list(),
  queryFn: async () => z.array(machineSchema).parse(await authApi.get('flows/all/').json()),
  select: (machines: Machine[]) =>
    [...machines].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
})

/** The EBMS categories a machine's work can arrive under. */
export const categoriesQuery = queryOptions({
  queryKey: machinesKeys.categories(),
  queryFn: async () =>
    z.array(categorySchema).parse(await authApi.get('ebms/categories/all/').json())
})

export const useUpsertMachine = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, values }: { id?: number; values: MachineForm }) =>
      id
        ? authApi.patch(`flows/${id}/`, { json: values }).json()
        : authApi.post('flows/', { json: values }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: machinesKeys.all })
      onSuccess()
    }
  })

export const useDeleteMachine = (onSuccess: () => void) =>
  useMutation({
    // The API refuses a machine that still holds work, and only it knows that.
    meta: { errorTitle: 'The machine stayed' },
    mutationFn: (id: number) => authApi.delete(`flows/${id}/`),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: machinesKeys.all })
      onSuccess()
    }
  })

export const useUpdateMaxPackageWeight = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, values }: { id: number; values: MaxPackageWeightForm }) =>
      authApi.patch(`departments/${id}/`, { json: values }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      // Every feature's copy of the departments, the boards' ceiling included.
      await client.invalidateQueries({ queryKey: ['departments'] })
      onSuccess()
    }
  })

// A page is what the server hands out unasked; the list runs into the hundreds.
const SUPPLIERS_PAGE_SIZE = 50

const suppliersPageSchema = z.object({
  count: z._default(z.number(), 0),
  results: z._default(z.array(z.object({ supplier: z.string() })), [])
})

/** The vendors EBMS buys coils from, alphabetical, a page at a time. Read-only: EBMS keeps them. */
export const coilSuppliersQuery = (search: string) =>
  infiniteQueryOptions({
    // Its own root: suppliers live in EBMS and nothing a machine write does touches them.
    queryKey: ['coil-suppliers', search] as const,
    queryFn: async ({ pageParam }) =>
      suppliersPageSchema.parse(
        await authApi
          .get('coil-suppliers/', {
            searchParams: {
              search,
              limit: SUPPLIERS_PAGE_SIZE,
              offset: pageParam
            }
          })
          .json()
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.results.length, 0)
      return loaded < last.count ? loaded : undefined
    },
    // The last term's list stays up while the next one loads, instead of blanking per keystroke.
    placeholderData: keepPreviousData
  })
