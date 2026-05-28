import * as z from 'zod/mini'

import { EmailSchema, PasswordSchema } from '../schema'
import { UserSchema } from '../users/schema'

export const LoginPayloadSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema
})

export const RefreshPayloadSchema = z.object({
  refresh: z.string()
})

export const RefreshResponseSchema = z.object({
  access: z.string(),
  refresh: z.string()
})

export const LoginResponseSchema = z.object({
  access: z.string(),
  refresh: z.string(),
  user: UserSchema
})

export type LoginPayload = z.infer<typeof LoginPayloadSchema>
export type RefreshPayload = z.infer<typeof RefreshPayloadSchema>
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
