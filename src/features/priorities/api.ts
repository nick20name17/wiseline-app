import { authApi } from '@/api/client'
import { queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'

const departmentSchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  code: z._default(z.string(), '')
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

export const priorityFormSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required')),
  color: z._default(z.string(), '#2563eb'),
  position: z.number().check(z.minimum(0, 'Hierarchy starts at 0')),
  department: z.number()
})

export type PriorityForm = z.infer<typeof priorityFormSchema>

export const prioritiesKeys = {
  all: ['priorities'] as const,
  list: () => [...prioritiesKeys.all, 'list'] as const
}

const matches = (priority: Priority, search: string) => priority.name.toLowerCase().includes(search)

/**
 * Every department's priorities in one list. `GET /priorities/` takes no filter at all — see
 * TODO.md — so the department column is what tells them apart, and the search narrows the one page.
 */
export const prioritiesQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: prioritiesKeys.list(),
    queryFn: async () => z.array(prioritySchema).parse(await authApi.get('priorities/').json()),
    select: (priorities: Priority[]) => {
      const found = search
        ? priorities.filter(priority => matches(priority, search.toLowerCase()))
        : priorities
      // Department first, then the hierarchy inside it — the order the board reads them in.
      return [...found].sort(
        (a, b) => (a.department ?? 0) - (b.department ?? 0) || a.position - b.position
      )
    }
  })

export const useUpsertPriority = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, values }: { id?: number; values: PriorityForm }) =>
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
