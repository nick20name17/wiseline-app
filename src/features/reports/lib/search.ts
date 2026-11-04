import * as z from 'zod/mini'

// A stray or mistyped param shows the default report, not a 4xx.
const isoDay = z.catch(z.optional(z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/))), undefined)

export const reportsSearchSchema = z.object({
  // The department's code, which reads better in a link than its id.
  department: z.catch(z.optional(z.string()), undefined),
  from: isoDay,
  to: isoDay
})
