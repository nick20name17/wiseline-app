import * as z from 'zod/mini'

import { EmailSchema, PasswordSchema } from '../schema'

export const RequestResetPasswordSchema = z.object({
  email: EmailSchema
})

export const ResetConfirmPasswordsSchema = z
  .object({
    new_password1: PasswordSchema,
    new_password2: PasswordSchema
  })
  .check(
    z.refine((data) => data.new_password1 === data.new_password2, {
      message: 'Passwords do not match',
      path: ['new_password2']
    })
  )

export type RequestResetPasswordPayload = z.infer<typeof RequestResetPasswordSchema>
export type ResetConfirmPasswordsPayload = z.infer<typeof ResetConfirmPasswordsSchema>

export type ResetConfirmPasswordPayload = z.infer<typeof ResetConfirmPasswordsSchema> & {
  token: string
  uid64: string
}
