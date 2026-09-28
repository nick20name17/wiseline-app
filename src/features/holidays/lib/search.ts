import * as z from 'zod/mini'

// A stray `?year=` should show this year, not a 4xx.
export const holidaysSearchSchema = z.object({
  year: z.catch(z.optional(z.int()), undefined)
})
