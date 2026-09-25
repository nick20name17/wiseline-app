import * as z from 'zod/mini'

// A stray `?search=` should show every truck, not a 4xx.
export const trucksSearchSchema = z.object({
  search: z.catch(z.optional(z.string()), undefined)
})
