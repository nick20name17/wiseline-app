import * as z from 'zod/mini'

import type { ApiResponse, PaginationParams } from '../types'

export const UserRolesSchema = z.enum([
  'admin',
  'worker',
  'manager',
  'client',
  'driver',
  'super_manager'
])

export const PRODUCTION_TYPES = [
  'Rollforming',
  'Trim',
  'Accessories',
  'Standing Seam',
  'Board & Batten',
  'Flatstock'
] as const

export const ProductionTypeSchema = z.enum(PRODUCTION_TYPES)

export const PROCESS_TYPES = ['production', 'dispatch', 'shipping', 'loading', 'driver'] as const

export const ProcessTypeSchema = z.enum(PROCESS_TYPES)

export const UserSchema = z.object({
  id: z.number(),
  email: z.email(),
  is_active: z.boolean(),
  is_superuser: z.boolean(),
  is_verified: z.boolean(),
  first_name: z.string().check(z.minLength(1)),
  last_name: z.string().check(z.minLength(1)),
  role: UserRolesSchema,
  category: z.array(z.string()),
  user_profiles: z.array(z.string()),
  prod_types: z.array(ProductionTypeSchema),
  process_types: z.array(ProcessTypeSchema)
})

export const CreateUserSchema = z.pick(UserSchema, {
  email: true,
  first_name: true,
  last_name: true,
  role: true,
  process_types: true,
  prod_types: true
})

export const UpdateUserSchema = z.object({
  id: z.optional(z.number()),
  payload: CreateUserSchema
})

export type UserRoles = z.infer<typeof UserRolesSchema>
export type User = z.infer<typeof UserSchema>
export type UsersResponse = ApiResponse<User>
export type ProductCategory = z.infer<typeof ProductionTypeSchema>
export type ProcessType = z.infer<typeof ProcessTypeSchema>
export type CreateUserPayload = z.infer<typeof CreateUserSchema>
export type UpdateUserPayload = z.infer<typeof UpdateUserSchema>

export type UsersSearchParams = Partial<
  {
    search: string
  } & PaginationParams
>
