import * as z from 'zod/mini'

export const TokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
})
export type Tokens = z.infer<typeof TokensSchema>

// TODO: match your backend's user shape
export const UserSchema = z.object({
  id: z.string(),
  email: z.email()
})
export type User = z.infer<typeof UserSchema>

export const SessionSchema = z.object({
  ...TokensSchema.shape,
  user: UserSchema
})
export type Session = z.infer<typeof SessionSchema>
