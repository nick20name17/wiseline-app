import * as z from 'zod/mini'

// A stray `?search=` should show every warehouse, not a 4xx.
export const warehousesSearchSchema = z.object({
  search: z.catch(z.optional(z.string()), undefined)
})
