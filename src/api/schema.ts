import * as z from 'zod/mini'

export const PasswordSchema = z
  .string()
  .check(
    z.minLength(8, { error: 'Password must contain at least 8 characters' }),
    z.maxLength(32, { error: 'Password must contain at most 32 characters' }),
    z.regex(/[a-z]/, { error: 'Password must contain at least one lowercase letter' }),
    z.regex(/[a-z]/, { error: 'Password must contain at least one lowercase letter' }),
    z.regex(/[A-Z]/, { error: 'Password must contain at least one uppercase letter' }),
    z.regex(/[0-9]/, { error: 'Password must contain at least one digit' }),
    z.regex(/[^a-zA-Z0-9]/, { error: 'Password must contain at least one special character' })
  )

export const EmailSchema = z
  .email({ error: 'Invalid email' })
  .check(z.minLength(1, 'Email is required'))
