import { isSafeRedirectPath } from './safe-redirect'
import * as z from 'zod/mini'

// Invalid `?next=` is silently dropped so the login page still renders.
export const loginSearchSchema = z.object({
  next: z.catch(z.optional(z.string().check(z.refine(isSafeRedirectPath))), undefined)
})
