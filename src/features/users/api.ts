import { authApi } from '@/api/client'
import { keepPreviousData, queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'
import { DEPARTMENTS, ROLES, toUserTypes, type Role } from './lib/roles'

// `role` arrives as a plain string and the two type lists arrive as null for roles that have
// none, so both are read leniently: an unfamiliar role still has to render.
const userSchema = z.object({
  id: z.number(),
  email: z._default(z.string(), ''),
  first_name: z._default(z.string(), ''),
  last_name: z._default(z.string(), ''),
  role: z._default(z.string(), ''),
  is_active: z._default(z.boolean(), true),
  process_types: z.catch(z.array(z.string()), []),
  prod_types: z.catch(z.array(z.string()), [])
})

const userPageSchema = z.object({
  count: z.number(),
  results: z.array(userSchema)
})

export type User = z.infer<typeof userSchema>

const PASSWORD_MIN_LENGTH = 8

export const userFormSchema = z.object({
  first_name: z.string().check(z.minLength(1, 'First name is required')),
  last_name: z.string().check(z.minLength(1, 'Last name is required')),
  email: z.string().check(z.email('Enter a valid email')),
  role: z.enum(ROLES),
  departments: z.array(z.enum(DEPARTMENTS))
})

// Only a new account carries a password; an edit leaves the existing one alone.
export const newUserFormSchema = z.object({
  ...userFormSchema.shape,
  password: z
    .string()
    .check(z.minLength(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`))
})

export type UserForm = z.infer<typeof userFormSchema> & { password?: string }

// The form holds a flat list of departments; the API wants two typed lists, which the role
// decides the shape of.
const toPayload = ({ departments, role, ...names }: UserForm) => ({
  ...names,
  role,
  ...toUserTypes(role as Role, departments)
})

export const usersKeys = {
  all: ['users'] as const,
  list: (search: string | undefined) => [...usersKeys.all, 'list', search ?? ''] as const
}

const PAGE_SIZE = 100

// The server matches the full name and the email.
export const usersQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: usersKeys.list(search),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      userPageSchema.parse(
        await authApi
          .get('users/', { searchParams: { limit: PAGE_SIZE, ...(search ? { search } : {}) } })
          .json()
      ).results
  })

export const useUpsertUser = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ id, values }: { id?: number; values: UserForm }) =>
      id
        ? authApi.patch(`users/${id}/`, { json: toPayload(values) }).json()
        : authApi
            .post('users/', { json: { ...toPayload(values), password: values.password } })
            .json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: usersKeys.all })
      onSuccess()
    }
  })

export const useDeleteUser = () =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`users/${id}/`),
    onSuccess: (_, __, ___, { client }) => client.invalidateQueries({ queryKey: usersKeys.all })
  })
