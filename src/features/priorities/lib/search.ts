import * as z from 'zod/mini'

// A stray `?department=` should show every department, not a 4xx.
export const prioritiesSearchSchema = z.object({
  // The department's code, which reads better in a link than its id.
  department: z.catch(z.optional(z.string()), undefined)
})
