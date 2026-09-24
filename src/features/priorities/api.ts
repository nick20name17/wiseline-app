import { authApi } from '@/api/client'
import { queryOptions, useMutation } from '@tanstack/react-query'
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

/** The departments a priority can belong to. Same key and shape the boards use, so one copy is cached. */
export const departmentsQuery = queryOptions({
  queryKey: ['departments', 'all'] as const,
  queryFn: async () => z.array(departmentSchema).parse(await authApi.get('departments/all/').json())
})

const prioritySchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  color: z._default(z.nullable(z.string()), null),
  // The board calls it Hierarchy: a lower number sorts first.
  position: z._default(z.number(), 0),
  department: z._default(z.nullable(z.number()), null)
})

export type Priority = z.infer<typeof prioritySchema>

// The hierarchy is not asked for: a new priority goes last in its department and is dragged from there.
export const priorityFormSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required')),
  color: z.string().check(z.minLength(1, 'Pick a colour')),
  department: z.number()
})

export type PriorityForm = z.infer<typeof priorityFormSchema>

export const prioritiesKeys = {
  all: ['priorities'] as const,
  list: () => [...prioritiesKeys.all, 'list'] as const
}

/** A priority with no department is on every department's board, as the Trim board reads them. */
export const onBoard = (priority: Priority, departmentId: number) =>
  priority.department === null || priority.department === departmentId

/**
 * One department's priorities, or every department's when none is given, top of the hierarchy
 * first; one with no department is listed and ordered with each. The list is fetched whole, not with
 * `?department=`, because a drag and a new priority's position are worked out against that one cache.
 */
export const prioritiesQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: prioritiesKeys.list(),
    queryFn: async () => z.array(prioritySchema).parse(await authApi.get('priorities/').json()),
    select: (priorities: Priority[]) =>
      priorities
        .filter(priority => departmentId === undefined || onBoard(priority, departmentId))
        .sort((a, b) => a.position - b.position || a.id - b.id)
  })

export const useUpsertPriority = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, values }: { id?: number; values: PriorityForm & { position?: number } }) =>
      id
        ? authApi.patch(`priorities/${id}/`, { json: values }).json()
        : authApi.post('priorities/', { json: values }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: prioritiesKeys.all })
      onSuccess()
    }
  })

export const useDeletePriority = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`priorities/${id}/`),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: prioritiesKeys.all })
      onSuccess()
    }
  })

export type PriorityOrder = {
  /** `null` is the hierarchy of the priorities with no department. */
  department: number | null
  ids: number[]
}

/**
 * Saves a drag in one write: the server renumbers the hierarchy 1..n in the order given. The list
 * moves at once and snaps back if the save fails.
 */
export const useReorderPriorities = () =>
  useMutation({
    meta: { errorTitle: 'The order was not saved' },
    mutationFn: ({ department, ids }: PriorityOrder) =>
      authApi.post('priorities/reorder/', { json: { department, ids } }).json(),
    onMutate: async ({ ids }, { client }) => {
      await client.cancelQueries({ queryKey: prioritiesKeys.list() })
      const previous = client.getQueryData<Priority[]>(prioritiesKeys.list())
      const positions = new Map(ids.map((id, index) => [id, index + 1]))
      client.setQueryData<Priority[]>(prioritiesKeys.list(), priorities =>
        priorities?.map(priority => ({
          ...priority,
          position: positions.get(priority.id) ?? priority.position
        }))
      )
      return { previous }
    },
    onError: (_, __, result, { client }) =>
      client.setQueryData(prioritiesKeys.list(), result?.previous),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: prioritiesKeys.all })
  })
