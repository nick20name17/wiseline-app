import { isSafeRedirectPath } from './safe-redirect'
import * as z from 'zod/mini'

// Invalid `?redirect=` is silently dropped so the login page still renders.
export const loginSearchSchema = z.object({
  redirect: z.catch(z.optional(z.string().check(z.refine(isSafeRedirectPath))), undefined)
})
