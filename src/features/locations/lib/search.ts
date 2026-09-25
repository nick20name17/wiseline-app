import * as z from 'zod/mini'

// A stray `?search=` or `?department=` should show everything, not a 4xx.
export const locationsSearchSchema = z.object({
  search: z.catch(z.optional(z.string()), undefined),
  // The department's code, which reads better in a link than its id.
  department: z.catch(z.optional(z.string()), undefined)
})
